/**
 * WhatsApp akışında her state için kullanıcıya gidecek mesajı gönderir.
 * Dil işletme ayarı whatsapp_lang ile belirlenir; çalışan seçimi metni employee_selection_label ile.
 */
const { sendTextMessage, sendInteractiveButtons, sendInteractiveList } = require('../providers/whatsapp/sendMessage');
const whatsappStateService = require('./whatsappStateService');
const { getWaT } = require('../i18n/wa');
const { BusinessSettings } = require('../models');

/**
 * Entegrasyondan token alır (şifreli alan düz metin olarak saklanıyorsa aynen kullanılır).
 */
function getAccessToken(integration) {
  return integration.token_encrypted || '';
}

/** İşletme için WhatsApp dil ve çalışan etiketini yükler. */
async function loadWaSettings(businessId) {
  const settings = await BusinessSettings.findOne({ where: { business_id: businessId } });
  const lang = (settings && settings.whatsapp_lang) ? settings.whatsapp_lang : 'tr';
  const locale = lang === 'en' ? 'en-US' : 'tr-TR';
  const t = getWaT(lang);
  const employeeSelectionLabel = settings ? settings.employee_selection_label : null;
  return { t, locale, employeeSelectionLabel };
}

/**
 * State'e göre kullanıcıya mesaj gönderir. Session güncel state ile çağrılmalı.
 * @param {object} integration - WhatsappIntegration instance (phone_number_id, token_encrypted)
 * @param {string} waId - Alıcı wa_id (telefon numarası)
 * @param {object} session - WhatsappSession (state, context_json, business_id)
 */
async function sendReplyForState(integration, waId, session) {
  const phoneNumberId = integration.phone_number_id;
  const token = getAccessToken(integration);
  if (!token) return;

  const { t, locale, employeeSelectionLabel } = await loadWaSettings(session.business_id);
  const state = session.state;
  const ctx = whatsappStateService.getContext(session);

  if (state === 'WELCOME') {
    const body = t('welcome_body');
    const buttons = [
      { id: 'appointment', title: t('welcome_btn_appointment') },
      { id: 'queue', title: t('welcome_btn_queue') },
      { id: 'cancel', title: t('welcome_btn_cancel') },
    ];
    await sendInteractiveButtons(phoneNumberId, token, waId, body, buttons);
    return;
  }

  if (state === 'DATE_SELECT') {
    const { bodyText, sections } = whatsappStateService.getDateOptionsForList(t);
    await sendInteractiveList(phoneNumberId, token, waId, bodyText, t('date_select_button'), sections);
    return;
  }

  if (state === 'EMPLOYEE_SELECT') {
    const { bodyText, sections } = await whatsappStateService.getEmployeeListRows(session.business_id, { t, employeeSelectionLabel });
    await sendInteractiveList(phoneNumberId, token, waId, bodyText, t('employee_select_button'), sections);
    return;
  }

  if (state === 'TIME_SELECT') {
    const { bodyText, sections } = await whatsappStateService.getSlotListRows(
      session.business_id,
      ctx.selectedEmployeeId,
      ctx.selectedDate,
      t
    );
    if (sections[0].rows.length === 0) {
      await sendTextMessage(phoneNumberId, token, waId, t('time_select_no_slots'));
      return;
    }
    await sendInteractiveList(phoneNumberId, token, waId, bodyText, t('time_select_button'), sections);
    return;
  }

  if (state === 'CONFIRM') {
    const summary = await whatsappStateService.formatConfirmSummary(session, t, locale);
    const buttons = [
      { id: 'confirm', title: t('confirm_btn_confirm') },
      { id: 'back', title: t('confirm_btn_back') },
      { id: 'cancel', title: t('confirm_btn_cancel') },
    ];
    await sendInteractiveButtons(phoneNumberId, token, waId, summary, buttons);
    return;
  }

  if (state === 'QUEUE_CONFIRM') {
    const body = t('queue_confirm_body');
    const buttons = [
      { id: 'confirm', title: t('queue_btn_confirm') },
      { id: 'cancel', title: t('queue_btn_cancel') },
    ];
    await sendInteractiveButtons(phoneNumberId, token, waId, body, buttons);
    return;
  }

  if (state === 'CANCELLED') {
    await sendTextMessage(phoneNumberId, token, waId, t('cancelled_message'));
    return;
  }
}

/**
 * Randevu onaylandıktan sonra sonuç mesajı (Onaylandı / Onaya gönderildi).
 */
async function sendAppointmentResult(integration, waId, appointment) {
  const phoneNumberId = integration.phone_number_id;
  const token = getAccessToken(integration);
  if (!token) return;
  const { t } = await loadWaSettings(appointment.business_id);
  const text = whatsappStateService.getResultMessageForAppointment(appointment, t);
  await sendTextMessage(phoneNumberId, token, waId, text);
}

/**
 * Sıraya eklendikten sonra bilgi mesajı.
 */
async function sendQueueResult(integration, waId, position, businessId) {
  const phoneNumberId = integration.phone_number_id;
  const token = getAccessToken(integration);
  if (!token) return;
  const { t } = await loadWaSettings(businessId);
  let text = t('queue_result_prefix');
  if (position !== undefined && position !== null) {
    text += ` ${t('queue_result_position')} ${position + 1}.`;
  }
  text += '\n' + t('queue_result_suffix');
  await sendTextMessage(phoneNumberId, token, waId, text);
}

module.exports = {
  sendReplyForState,
  sendAppointmentResult,
  sendQueueResult,
};
