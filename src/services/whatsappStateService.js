const config = require('../config');
const { WhatsappSession, WhatsappIntegration, Employee, WaUser, Appointment, BookingSettings } = require('../models');
const { addMinutes } = require('../utils/time');
const { todayISO, tomorrowISO } = require('../utils/time');
const availabilityService = require('./availabilityService');

const SESSION_TTL_MINUTES = config.whatsapp.sessionTtlMinutes || 15;
const STATES = ['WELCOME', 'EMPLOYEE_SELECT', 'DATE_SELECT', 'TIME_SELECT', 'CONFIRM', 'DONE', 'CANCELLED'];

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
        context_json: {},
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

async function createAppointmentFromSession(session, waUserId) {
  const ctx = getContext(session);
  const employeeId = ctx.selectedEmployeeId;
  const dateStr = ctx.selectedDate;
  const slot = ctx.selectedSlot;
  if (!employeeId || !dateStr || !slot) return null;
  const availableSlots = await getSlotsForDate(session.business_id, employeeId, dateStr);
  const slotNormalized = String(slot).trim().length === 5 && String(slot).includes(':') ? String(slot).trim() : null;
  if (!slotNormalized || !availableSlots.includes(slotNormalized)) return null;
  const Sequelize = require('sequelize');
  const Op = Sequelize.Op;
  const dayStart = new Date(dateStr + 'T00:00:00');
  const dayEnd = new Date(dateStr + 'T23:59:59');
  const existingSameDay = await Appointment.findOne({
    where: {
      business_id: session.business_id,
      wa_user_id: waUserId,
      status: { [Op.ne]: 'cancelled' },
      starts_at: { [Op.gte]: dayStart, [Op.lte]: dayEnd },
    },
  });
  if (existingSameDay) return null;
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
  return appointment;
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
  SESSION_TTL_MINUTES,
  STATES,
  todayISO,
  tomorrowISO,
};
