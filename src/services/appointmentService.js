const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const { Appointment, AppointmentRequestLog, Contact } = require('../models');
const notificationService = require('./notificationService');
const subscriptionService = require('./subscriptionService');
const availabilityService = require('./availabilityService');

function getDateStrFromStartsAt(startsAt) {
  const d = new Date(startsAt);
  const y = d.getFullYear();
  const mo = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getSlotStrFromStartsAt(startsAt) {
  const d = new Date(startsAt);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function createPublicAppointment(businessId, data) {
  await subscriptionService.requireCoreSubscription(businessId);
  const { employee_id: employeeId, customer_id: customerId, starts_at: startsAt, name, surname } = data;
  if (!employeeId || !customerId || !startsAt) {
    const err = new Error('employee_id, customer_id ve starts_at zorunludur');
    err.code = 'validation_error';
    err.status = 400;
    throw err;
  }
  const dateStr = getDateStrFromStartsAt(startsAt);
  const requestedSlot = getSlotStrFromStartsAt(startsAt);
  const availableSlots = await availabilityService.getSlotsForEmployee(businessId, employeeId, dateStr);
  if (!availableSlots.includes(requestedSlot)) {
    const err = new Error('Seçilen saat müsait değil');
    err.code = 'slot_not_available';
    err.status = 400;
    throw err;
  }
  const dayStart = new Date(dateStr + 'T00:00:00');
  const dayEnd = new Date(dateStr + 'T23:59:59');
  const existingSameDay = await Appointment.findOne({
    where: {
      business_id: businessId,
      customer_id: customerId,
      status: { [Op.ne]: 'cancelled' },
      starts_at: { [Op.gte]: dayStart, [Op.lte]: dayEnd },
    },
  });
  if (existingSameDay) {
    const err = new Error('Aynı gün için zaten bir randevunuz var');
    err.code = 'one_appointment_per_day';
    err.status = 400;
    throw err;
  }
  const bookingSettings = await require('../models').BookingSettings.findOne({ where: { business_id: businessId } });
  const autoApprove = bookingSettings && bookingSettings.auto_approve;
  const appointment = await Appointment.create({
    business_id: businessId,
    employee_id: employeeId,
    customer_id: customerId,
    wa_user_id: null,
    starts_at: new Date(startsAt),
    status: 'scheduled',
    approval_status: autoApprove ? 'approved' : 'pending',
    requested_at: new Date(),
    approved_at: autoApprove ? new Date() : null,
    source_channel: 'web',
  });
  await AppointmentRequestLog.create({
    appointment_id: appointment.id,
    action: 'created',
    actor_type: 'customer',
    payload_json: { name, surname },
  });
  const business = await require('../models').Business.findByPk(businessId);
  const notifyChannels = {
    sms: bookingSettings && bookingSettings.notify_sms,
    email: bookingSettings && bookingSettings.notify_email,
  };
  await notificationService.notifyBusinessNewAppointment(business, appointment, notifyChannels);
  if (autoApprove) {
    const customer = await require('../models').Customer.findByPk(customerId);
    await notificationService.notifyCustomerAppointmentApproved(customer && customer.phone_e164, appointment, { sms: true });
  }
  return appointment;
}

async function approveAppointment(businessId, appointmentId) {
  const appointment = await Appointment.findOne({
    where: { id: appointmentId, business_id: businessId },
  });
  if (!appointment) {
    const err = new Error('Randevu bulunamadı');
    err.code = 'not_found';
    err.status = 404;
    throw err;
  }
  if (appointment.approval_status !== 'pending') {
    const err = new Error('Randevu zaten onaylı veya reddedilmiş');
    err.code = 'invalid_status';
    err.status = 400;
    throw err;
  }
  await appointment.update({
    approval_status: 'approved',
    approved_at: new Date(),
  });
  await AppointmentRequestLog.create({
    appointment_id: appointment.id,
    action: 'approved',
    actor_type: 'business',
    payload_json: {},
  });
  const canWa = await subscriptionService.canUseWhatsApp(businessId);
  let phoneE164 = null;
  if (appointment.customer_id) {
    const customer = await require('../models').Customer.findByPk(appointment.customer_id);
    phoneE164 = customer && customer.phone_e164;
  }
  await notificationService.notifyCustomerAppointmentApproved(phoneE164, appointment, { sms: true, whatsapp: canWa });
  return appointment;
}

async function rejectAppointment(businessId, appointmentId) {
  const appointment = await Appointment.findOne({
    where: { id: appointmentId, business_id: businessId },
  });
  if (!appointment) {
    const err = new Error('Randevu bulunamadı');
    err.code = 'not_found';
    err.status = 404;
    throw err;
  }
  if (appointment.approval_status !== 'pending') {
    const err = new Error('Randevu zaten işlenmiş');
    err.code = 'invalid_status';
    err.status = 400;
    throw err;
  }
  await appointment.update({ approval_status: 'rejected' });
  await AppointmentRequestLog.create({
    appointment_id: appointment.id,
    action: 'rejected',
    actor_type: 'business',
    payload_json: {},
  });
  return appointment;
}

async function upsertContactFromCustomer(businessId, customer) {
  if (!customer) return null;
  const [contact] = await Contact.findOrCreate({
    where: { business_id: businessId, phone_e164: customer.phone_e164 },
    defaults: {
      business_id: businessId,
      phone_e164: customer.phone_e164,
      full_name: [customer.name, customer.surname].filter(Boolean).join(' ') || 'Müşteri',
      source_channel: 'web',
    },
  });
  if (contact) {
    await contact.update({
      full_name: [customer.name, customer.surname].filter(Boolean).join(' ') || contact.full_name,
      last_appointment_at: new Date(),
    });
  }
  return contact;
}

module.exports = {
  createPublicAppointment,
  approveAppointment,
  rejectAppointment,
  upsertContactFromCustomer,
};
