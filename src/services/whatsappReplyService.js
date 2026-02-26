/**
 * WhatsApp akışında her state için kullanıcıya gidecek mesajı gönderir.
 * Dil işletme ayarı whatsapp_lang ile belirlenir.
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

/** İşletme için WhatsApp dilini yükler. */
async function loadWaSettings(businessId) {
  const settings = await BusinessSettings.findOne({ where: { business_id: businessId } });
  const lang = (settings && settings.whatsapp_lang) ? settings.whatsapp_lang : 'tr';
  const locale = lang === 'en' ? 'en-US' : 'tr-TR';
  const t = getWaT(lang);
  return { t, locale };
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
  if (!token) {
    console.warn('[WhatsApp] Yanıt gönderilmedi: token yok (business_id=%s, waId=%s). Connect ile token kaydedin.', session.business_id, waId);
    return;
  }

  const { t, locale } = await loadWaSettings(session.business_id);
  const state = session.state;
  const ctx = whatsappStateService.getContext(session);

  if (state === 'WELCOME') {
    const ctx = whatsappStateService.getContext(session);
    if (ctx._timedOut) {
      await sendTextMessage(phoneNumberId, token, waId, t('timeout_message'));
      if (typeof session.update === 'function') {
        await session.update({ context_json: {} }).catch(() => {});
      }
    }
    const body = t('welcome_body');
    const sections = [
      {
        title: t('welcome_menu_section_title'),
        rows: [
          { id: 'appointment', title: t('welcome_btn_appointment') },
          { id: 'my_appointments', title: t('welcome_btn_my_appointments') },
          { id: 'cancel', title: t('welcome_btn_cancel') },
        ],
      },
    ];
    await sendInteractiveList(phoneNumberId, token, waId, body, t('welcome_list_button'), sections);
    return;
  }

  if (state === 'DATE_SELECT') {
    const { bodyText, sections } = whatsappStateService.getDateOptionsForList(t);
    await sendInteractiveList(phoneNumberId, token, waId, bodyText, t('date_select_button'), sections);
    return;
  }

  if (state === 'EMPLOYEE_SELECT') {
    const { bodyText, sections } = await whatsappStateService.getEmployeeListRows(session.business_id, { t });
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
      const noSlotsBody = t('time_select_no_slots');
      const noSlotsButtons = [
        { id: 'other_day', title: t('no_slots_btn_other_day') },
        { id: 'other_employee', title: t('no_slots_btn_other_employee') },
        { id: 'menu', title: t('no_slots_btn_menu') },
      ];
      await sendInteractiveButtons(phoneNumberId, token, waId, noSlotsBody, noSlotsButtons);
      return;
    }
    await sendInteractiveList(phoneNumberId, token, waId, bodyText, t('time_select_button'), sections);
    return;
  }

  if (state === 'CONFIRM') {
    const summary = await whatsappStateService.formatConfirmSummary(session, t, locale);
    const sections = [
      {
        title: t('confirm_summary_prefix'),
        rows: [
          { id: 'confirm', title: t('confirm_btn_confirm') },
          { id: 'back_employee', title: t('confirm_btn_back_employee') },
          { id: 'back_date', title: t('confirm_btn_back_date') },
          { id: 'back_time', title: t('confirm_btn_back_time') },
          { id: 'cancel', title: t('confirm_btn_cancel') },
        ],
      },
    ];
    await sendInteractiveList(phoneNumberId, token, waId, summary, t('confirm_list_button'), sections);
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

  if (state === 'MY_APPOINTMENTS') {
    const { bodyText, sections, isEmpty } = await whatsappStateService.getMyAppointmentsListRows(
      session.business_id,
      waId,
      t,
      locale
    );

    if (isEmpty) {
      await sendTextMessage(phoneNumberId, token, waId, bodyText);
      return;
    }
    await sendInteractiveList(phoneNumberId, token, waId, bodyText, t('my_appointments_list_button'), sections);
    return;
  }

  if (state === 'APPOINTMENT_ACTION') {
    const body = t('my_appointments_action_body');
    const buttons = [
      { id: 'cancel_appointment', title: t('appointment_action_cancel') },
      { id: 'keep', title: t('appointment_action_keep') },
      { id: 'exit', title: t('appointment_action_exit') },
    ];
    await sendInteractiveButtons(phoneNumberId, token, waId, body, buttons);
    return;
  }

  if (state === 'CONFIRM_CANCEL_APPOINTMENT') {
    const body = t('confirm_cancel_appointment_body');
    const buttons = [
      { id: 'confirm_cancel', title: t('confirm_cancel_btn_confirm') },
      { id: 'back', title: t('confirm_cancel_btn_back') },
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
  const { t, locale } = await loadWaSettings(appointment.business_id);
  const text = await whatsappStateService.getResultMessageForAppointment(appointment, t, locale);
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
