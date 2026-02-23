const smsProvider = require('../providers/sms');
const { sendTextMessage } = require('../providers/whatsapp/sendMessage');
const { WaUser, WhatsappIntegration, BusinessSettings } = require('../models');
const { getWaT } = require('../i18n/wa');

async function sendWhatsAppToAppointmentCustomer(businessId, waUserId, textOrKey) {
  if (!waUserId) return;
  const waUser = await WaUser.findByPk(waUserId, { attributes: ['wa_id'] });
  if (!waUser || !waUser.wa_id) return;
  const integration = await WhatsappIntegration.findOne({
    where: { business_id: businessId, status: 'active' },
  });
  if (!integration || !integration.token_encrypted) return;
  let text = textOrKey;
  if (textOrKey === 'appointment_approved_notify' || textOrKey === 'appointment_rejected_notify') {
    const settings = await BusinessSettings.findOne({ where: { business_id: businessId } });
    const lang = (settings && settings.whatsapp_lang) ? settings.whatsapp_lang : 'tr';
    text = getWaT(lang)(textOrKey);
  }
  try {
    await sendTextMessage(integration.phone_number_id, integration.token_encrypted, waUser.wa_id, text);
  } catch (err) {
    console.error('[notification] whatsapp send failed', err.message);
  }
}

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
  if (useWa && appointment.wa_user_id) {
    await sendWhatsAppToAppointmentCustomer(
      appointment.business_id,
      appointment.wa_user_id,
      'appointment_approved_notify'
    );
  }
}

async function notifyCustomerAppointmentRejected(phoneE164, appointment, channels = {}) {
  const { sms: useSms, whatsapp: useWa } = channels;
  if (useSms && phoneE164) {
    try {
      await smsProvider.sendOtp(phoneE164, `Randevu talebiniz reddedildi.`);
    } catch (err) {
      console.error('[notification] customer reject sms failed', err.message);
    }
  }
  if (useWa && appointment.wa_user_id) {
    await sendWhatsAppToAppointmentCustomer(
      appointment.business_id,
      appointment.wa_user_id,
      'appointment_rejected_notify'
    );
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
  notifyCustomerAppointmentRejected,
  notifyCustomerAppointmentCancelled,
  notifyCustomerAppointmentRescheduled,
};
