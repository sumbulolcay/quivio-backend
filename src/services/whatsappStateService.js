const config = require('../config');
const { WhatsappSession, WhatsappIntegration, Employee, WaUser, Appointment, BookingSettings, QueueEntry, Customer } = require('../models');
const { addMinutes } = require('../utils/time');
const { todayISO, tomorrowISO } = require('../utils/time');
const availabilityService = require('./availabilityService');
const { normalizeE164 } = require('../utils/phone');
const { Op } = require('sequelize');

const SESSION_TTL_MINUTES = config.whatsapp.sessionTtlMinutes || 15;
const MAX_DATE_DAYS = 10;
const STATES = ['WELCOME', 'DATE_SELECT', 'EMPLOYEE_SELECT', 'TIME_SELECT', 'CONFIRM', 'QUEUE_CONFIRM', 'MY_APPOINTMENTS', 'APPOINTMENT_ACTION', 'CONFIRM_CANCEL_APPOINTMENT', 'DONE', 'CANCELLED'];
const CANCEL_HOURS_MIN = 2; // Randevuya X saatten az kaldıysa iptal yok

/** Bugünden itibaren n gün sonrasının YYYY-MM-DD değeri */
function dateFromTodayOffset(n) {
  const d = new Date();
  d.setDate(d.getDate() + Number(n));
  return d.toISOString().slice(0, 10);
}

async function resolveBusinessFromPhoneNumberId(phoneNumberId) {
  const integration = await WhatsappIntegration.findOne({
    where: { phone_number_id: phoneNumberId, status: 'active' },
  });
  return integration ? integration.business_id : null;
}

/**
 * Webhook: Entegrasyonu bulur (status fark etmez). Bağlantı kesikse akış işlenmez ama 200 dönülür.
 */
async function resolveIntegrationByPhoneNumberId(phoneNumberId) {
  const integration = await WhatsappIntegration.findOne({
    where: { phone_number_id: phoneNumberId },
  });
  return integration;
}

async function getOrCreateSession(businessId, waId) {
  let session = await WhatsappSession.findOne({
    where: { business_id: businessId, wa_id: waId },
  });
  const now = new Date();
  const expiresAt = addMinutes(SESSION_TTL_MINUTES);
  if (session) {
    if (session.expires_at && new Date(session.expires_at) < now) {
      await session.update({
        state: 'WELCOME',
        context_json: { _timedOut: true },
        last_message_at: now,
        expires_at: expiresAt,
      });
    } else {
      await session.update({
        last_message_at: now,
        expires_at: expiresAt,
      });
    }
  } else {
    session = await WhatsappSession.create({
      business_id: businessId,
      wa_id: waId,
      state: 'WELCOME',
      context_json: {},
      last_message_at: now,
      expires_at: expiresAt,
    });
  }
  return session;
}

function getContext(session) {
  return session.context_json || {};
}

async function updateContext(session, update) {
  const ctx = { ...getContext(session), ...update };
  await session.update({ context_json: ctx });
  return ctx;
}

async function getActiveEmployees(businessId) {
  return Employee.findAll({
    where: { business_id: businessId, is_active: true },
    attributes: ['id', 'name', 'surname', 'role'],
  });
}

async function getSlotsForDate(businessId, employeeId, dateStr) {
  return availabilityService.getSlotsForEmployee(businessId, employeeId, dateStr);
}

/**
 * Aynı numaranın o gün başka randevusu var mı kontrol eder.
 * WhatsApp wa_user_id ile ve aynı telefonla web'den alınmış Customer randevuları sayılır.
 */
async function hasExistingAppointmentSameDay(businessId, waUserId, dateStr) {
  const dayStart = new Date(dateStr + 'T00:00:00');
  const dayEnd = new Date(dateStr + 'T23:59:59');
  const orConditions = [{ wa_user_id: waUserId }];
  if (waUserId) {
    const waUser = await WaUser.findByPk(waUserId, { attributes: ['wa_id'] });
    if (waUser && waUser.wa_id) {
      const phoneE164 = normalizeE164(waUser.wa_id) || (waUser.wa_id.startsWith('90') ? '+' + waUser.wa_id : null);
      if (phoneE164) {
        const customer = await Customer.findOne({
          where: { business_id: businessId, phone_e164: phoneE164 },
          attributes: ['id'],
        });
        if (customer) orConditions.push({ customer_id: customer.id });
      }
    }
  }
  const existing = await Appointment.findOne({
    where: {
      business_id: businessId,
      status: { [Op.ne]: 'cancelled' },
      starts_at: { [Op.gte]: dayStart, [Op.lte]: dayEnd },
      [Op.or]: orConditions,
    },
  });
  return !!existing;
}

/**
 * @returns {{ appointment: object|null, reason?: 'existing_same_day'|'slot_unavailable' }}
 */
async function createAppointmentFromSession(session, waUserId) {
  const ctx = getContext(session);
  const employeeId = ctx.selectedEmployeeId;
  const dateStr = ctx.selectedDate;
  const slot = ctx.selectedSlot;
  if (!employeeId || !dateStr || !slot) return { appointment: null };
  const availableSlots = await getSlotsForDate(session.business_id, employeeId, dateStr);
  const slotNormalized = String(slot).trim().length === 5 && String(slot).includes(':') ? String(slot).trim() : null;
  if (!slotNormalized || !availableSlots.includes(slotNormalized)) {
    return { appointment: null, reason: 'slot_unavailable' };
  }
  const existingSameDay = await hasExistingAppointmentSameDay(session.business_id, waUserId, dateStr);
  if (existingSameDay) {
    return { appointment: null, reason: 'existing_same_day' };
  }
  const [h, m] = slotNormalized.split(':').map(Number);
  const startsAt = new Date(dateStr + `T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
  const bookingSettings = await BookingSettings.findOne({ where: { business_id: session.business_id } });
  const autoApprove = bookingSettings && bookingSettings.auto_approve;
  const appointment = await Appointment.create({
    business_id: session.business_id,
    employee_id: employeeId,
    wa_user_id: waUserId,
    customer_id: null,
    starts_at: startsAt,
    status: 'scheduled',
    approval_status: autoApprove ? 'approved' : 'pending',
    requested_at: new Date(),
    approved_at: autoApprove ? new Date() : null,
    source_channel: 'whatsapp',
  });
  return { appointment };
}

/**
 * Randevu akışı: tarih seçenekleri (Bugün … 10 gün sonra). Liste için sections döner.
 * @param {(key: string, ...args: unknown[]) => string} t - getWaT(lang) çeviri fonksiyonu
 */
function getDateOptionsForList(t) {
  const labels = [
    t('date_today'),
    t('date_tomorrow'),
    t('date_days_later', 2),
    t('date_days_later', 3),
    t('date_days_later', 4),
    t('date_days_later', 5),
    t('date_days_later', 6),
    t('date_days_later', 7),
    t('date_days_later', 8),
    t('date_days_later', 9),
    t('date_days_later', 10),
  ];
  const rows = labels.map((title, i) => ({ id: String(i), title }));
  return { bodyText: t('date_select_body'), sections: [{ title: t('date_section_title'), rows }] };
}

/** Çalışan listesi için sections. bodyText çeviriden gelir (employee_select_body). */
async function getEmployeeListRows(businessId, { t }) {
  const employees = await getActiveEmployees(businessId);
  const rows = employees.map((e) => ({ id: String(e.id), title: [e.name, e.surname].filter(Boolean).join(' ').trim() || `Çalışan ${e.id}` }));
  return { bodyText: t('employee_select_body'), sections: [{ title: t('employees_section_title'), rows }] };
}

/** O gün + çalışan için müsait saatler. t: getWaT(lang). */
async function getSlotListRows(businessId, employeeId, dateStr, t) {
  const slots = await getSlotsForDate(businessId, employeeId, dateStr);
  const rows = slots.slice(0, 10).map((s) => ({ id: s, title: s }));
  return { bodyText: t('time_select_body'), sections: [{ title: t('time_section_title'), rows }] };
}

/** Onay ekranı özet metni (Gün, Çalışan, Saat). t: getWaT(lang). locale: 'tr-TR' | 'en-US'. */
async function formatConfirmSummary(session, t, locale) {
  const ctx = getContext(session);
  const dateStr = ctx.selectedDate;
  const employeeId = ctx.selectedEmployeeId;
  const slot = ctx.selectedSlot;
  if (!dateStr || !employeeId || !slot) return '';
  const employees = await getActiveEmployees(session.business_id);
  const emp = employees.find((e) => e.id === employeeId);
  const empName = emp ? [emp.name, emp.surname].filter(Boolean).join(' ').trim() : `Çalışan ${employeeId}`;
  const d = new Date(dateStr + 'T12:00:00');
  const dateLabel = d.toLocaleDateString(locale || 'tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `${t('confirm_summary_prefix')}\n• ${t('confirm_summary_day')}: ${dateLabel}\n• ${t('confirm_summary_employee')}: ${empName}\n• ${t('confirm_summary_time')}: ${slot}\n\n${t('confirm_summary_question')}`;
}

/**
 * Randevu sonucu mesajı (onay / beklemede). Tarih ve saat yan yana yazılır;
 * WA/telefon bunu algılayıp tıklanınca takvime ekleme seçeneği sunar.
 * @param {string} [locale] - 'tr-TR' | 'en-US' (işletme diline göre)
 */
async function getResultMessageForAppointment(appointment, t, locale) {
  const statusLine =
    appointment.approval_status === 'approved' ? t('appointment_approved') : t('appointment_pending');
  const emp = await Employee.findByPk(appointment.employee_id, { attributes: ['name', 'surname'] });
  const empName = emp ? [emp.name, emp.surname].filter(Boolean).join(' ').trim() : '';
  const start = new Date(appointment.starts_at);
  const loc = locale || 'tr-TR';
  const dateStr = start.toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = start.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  const dateTimeLine = `${dateStr} ${timeStr}`;
  const infoLine = empName ? `${dateTimeLine} - ${empName}` : dateTimeLine;
  return `${statusLine}\n\n${infoLine}`;
}

/** Sıra girişi oluşturur; queue_date = bugün, position = o günkü sıradaki sonraki numara. */
async function createQueueEntryFromSession(session, waUserId) {
  const ctx = getContext(session);
  const today = todayISO();
  const maxPos = await QueueEntry.max('position', {
    where: { business_id: session.business_id, queue_date: today, status: { [Op.ne]: 'cancelled' } },
  });
  const position = (maxPos == null ? -1 : maxPos) + 1;
  const entry = await QueueEntry.create({
    business_id: session.business_id,
    employee_id: ctx.selectedEmployeeId || null,
    wa_user_id: waUserId,
    customer_id: null,
    status: 'waiting',
    queue_date: today,
    position,
    source_channel: 'whatsapp',
  });
  return entry;
}

/** Kullanıcının aktif (ilerideki, iptal edilmemiş) randevuları. waId = session.wa_id. */
async function getActiveAppointmentsForWaUser(businessId, waId) {
  const waUser = await WaUser.findOne({ where: { business_id: businessId, wa_id: waId }, attributes: ['id', 'wa_id'] });
  const orConditions = waUser ? [{ wa_user_id: waUser.id }] : [];
  if (waUser && waUser.wa_id) {
    const phoneE164 = normalizeE164(waUser.wa_id) || (waUser.wa_id.startsWith('90') ? '+' + waUser.wa_id : null);
    if (phoneE164) {
      const customer = await Customer.findOne({
        where: { business_id: businessId, phone_e164: phoneE164 },
        attributes: ['id'],
      });
      if (customer) orConditions.push({ customer_id: customer.id });
    }
  }
  if (orConditions.length === 0) return [];
  const now = new Date();
  return Appointment.findAll({
    where: {
      business_id: businessId,
      status: { [Op.ne]: 'cancelled' },
      starts_at: { [Op.gte]: now },
      [Op.or]: orConditions,
    },
    include: [{ model: Employee, attributes: ['id', 'name', 'surname'], required: true }],
    order: [['starts_at', 'ASC']],
    limit: 10,
  });
}

/** Randevularım listesi için sections. waId = session.wa_id. */
async function getMyAppointmentsListRows(businessId, waId, t, locale) {
  const appointments = await getActiveAppointmentsForWaUser(businessId, waId);
  if (appointments.length === 0) return { bodyText: t('my_appointments_no'), sections: [], isEmpty: true };
  const rows = appointments.map((a) => {
    const emp = a.Employee;
    const empName = emp ? [emp.name, emp.surname].filter(Boolean).join(' ').trim() : '';
    const d = new Date(a.starts_at);
    const dateStr = d.toLocaleDateString(locale || 'tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString(locale || 'tr-TR', { hour: '2-digit', minute: '2-digit' });
    const title = `${dateStr} ${timeStr}`.slice(0, 24);
    return { id: String(a.id), title };
  });
  return { bodyText: t('my_appointments_body'), sections: [{ title: t('my_appointments_section_title'), rows }], isEmpty: false };
}

/**
 * Randevuyu iptal eder. Edge: zaten iptal, geçmiş, 2 saatten az kala. waId = session.wa_id.
 * @returns {{ cancelled: boolean, reason?: string, messageKey?: string }}
 */
async function cancelAppointmentByWaUser(businessId, appointmentId, waId) {
  const appointments = await getActiveAppointmentsForWaUser(businessId, waId);
  const appointment = appointments.find((a) => a.id === parseInt(appointmentId, 10));
  if (!appointment) {
    const a = await Appointment.findOne({
      where: { id: parseInt(appointmentId, 10), business_id: businessId },
    });
    if (!a) return { cancelled: false, reason: 'not_found' };
    if (a.status === 'cancelled') return { cancelled: false, reason: 'already_cancelled', messageKey: 'cancel_already' };
    if (new Date(a.starts_at) < new Date()) return { cancelled: false, reason: 'past', messageKey: 'cancel_past' };
    return { cancelled: false, reason: 'not_owned' };
  }
  const now = new Date();
  const startsAt = new Date(appointment.starts_at);
  const hoursLeft = (startsAt - now) / (1000 * 60 * 60);
  if (hoursLeft < CANCEL_HOURS_MIN) return { cancelled: false, reason: 'too_close', messageKey: 'cancel_too_close' };
  await appointment.update({ status: 'cancelled' });
  return { cancelled: true };
}

module.exports = {
  resolveBusinessFromPhoneNumberId,
  resolveIntegrationByPhoneNumberId,
  getOrCreateSession,
  getContext,
  updateContext,
  getActiveEmployees,
  getSlotsForDate,
  createAppointmentFromSession,
  getDateOptionsForList,
  getEmployeeListRows,
  getSlotListRows,
  formatConfirmSummary,
  getResultMessageForAppointment,
  createQueueEntryFromSession,
  getActiveAppointmentsForWaUser,
  getMyAppointmentsListRows,
  cancelAppointmentByWaUser,
  dateFromTodayOffset,
  MAX_DATE_DAYS,
  SESSION_TTL_MINUTES,
  STATES,
  todayISO,
  tomorrowISO,
};
