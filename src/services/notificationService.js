const smsProvider = require('../providers/sms');

async function notifyBusinessNewAppointment(business, appointment, channels = {}) {
  const { sms: smsTo, email: emailTo } = channels;
  if (smsTo) {
    try {
      await smsProvider.sendOtp(smsTo, `Yeni randevu talebi: ${appointment.starts_at}. Panelden kontrol edin.`);
    } catch (err) {
      console.error('[notification] business sms failed', err.message);
    }
  }
  if (emailTo) {
    // TODO: emailProvider.send(...)
  }
}

async function notifyCustomerAppointmentApproved(phoneE164, appointment, channels = {}) {
  const { sms: useSms, whatsapp: useWa } = channels;
  if (useSms && phoneE164) {
    try {
      await smsProvider.sendOtp(phoneE164, `Randevunuz onaylandı: ${appointment.starts_at}.`);
    } catch (err) {
      console.error('[notification] customer sms failed', err.message);
    }
  }
  if (useWa) {
    // TODO: whatsappProvider.send(...)
  }
}

async function notifyCustomerAppointmentCancelled(phoneE164, appointment, channels = {}) {
  const { sms: useSms } = channels;
  if (useSms && phoneE164) {
    try {
      await smsProvider.sendOtp(phoneE164, `Randevunuz iptal edildi: ${appointment.starts_at}.`);
    } catch (err) {
      console.error('[notification] customer cancel sms failed', err.message);
    }
  }
}

async function notifyCustomerAppointmentRescheduled(phoneE164, appointment, channels = {}) {
  const { sms: useSms } = channels;
  if (useSms && phoneE164) {
    try {
      await smsProvider.sendOtp(phoneE164, `Randevunuz güncellendi: ${appointment.starts_at}.`);
    } catch (err) {
      console.error('[notification] customer reschedule sms failed', err.message);
    }
  }
}

module.exports = {
  notifyBusinessNewAppointment,
  notifyCustomerAppointmentApproved,
  notifyCustomerAppointmentCancelled,
  notifyCustomerAppointmentRescheduled,
};
