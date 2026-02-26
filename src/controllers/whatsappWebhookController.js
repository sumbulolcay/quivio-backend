const { WhatsappMessageLog, WaUser, BusinessSettings } = require('../models');
const waPayload = require('../utils/waPayload');
const whatsappStateService = require('../services/whatsappStateService');
const whatsappReplyService = require('../services/whatsappReplyService');
const subscriptionService = require('../services/subscriptionService');
const { sendTextMessage, sendInteractiveButtons } = require('../providers/whatsapp/sendMessage');
const { getWaT } = require('../i18n/wa');

const PREV_STATE = {
  EMPLOYEE_SELECT: 'WELCOME',
  DATE_SELECT: 'EMPLOYEE_SELECT',
  TIME_SELECT: 'DATE_SELECT',
  CONFIRM: 'TIME_SELECT',
  MY_APPOINTMENTS: 'WELCOME',
  APPOINTMENT_ACTION: 'MY_APPOINTMENTS',
  CONFIRM_CANCEL_APPOINTMENT: 'APPOINTMENT_ACTION',
  QUEUE_CONFIRM: 'WELCOME',
};

async function handleIncoming(req, res, next) {
  try {
    const phoneNumberId = waPayload.getPhoneNumberId(req.body);
    if (!phoneNumberId) {
      return res.status(400).json({ code: 'invalid_payload', message: 'phone_number_id bulunamadı' });
    }
    const integration = await whatsappStateService.resolveIntegrationByPhoneNumberId(phoneNumberId);
    if (!integration) {
      return res.status(404).json({ code: 'business_not_found', message: 'Entegrasyon bulunamadı' });
    }
    if (integration.status !== 'active') {
      console.warn('[WhatsApp] Webhook: entegrasyon aktif değil (status=%s), yanıt gönderilmez.', integration.status);
      return res.status(200).send('OK');
    }
    const businessId = integration.business_id;
    const canUse = await subscriptionService.canUseWhatsApp(businessId);
    if (!canUse) {
      console.warn('[WhatsApp] Webhook: işletme WhatsApp kullanamıyor (plan/abonelik), business_id=%s. Yanıt gönderilmez.', businessId);
      return res.status(200).send('OK');
    }
    const message = waPayload.getMessage(req.body);
    if (!message) {
      return res.status(200).send('OK');
    }
    const messageId = waPayload.getMessageId(message);
    const waId = waPayload.getFromWaId(message);
    const existing = await WhatsappMessageLog.findOne({
      where: { business_id: businessId, message_id: messageId },
    });
    if (existing) {
      return res.status(200).send('OK');
    }
    await WhatsappMessageLog.create({
      business_id: businessId,
      direction: 'inbound',
      message_id: messageId,
      payload_json: req.body,
    });
    const value = waPayload.getValueFromPayload(req.body);
    const profile = waPayload.getContactProfile(value);
    const displayName = profile && profile.profile && profile.profile.name ? profile.profile.name : null;
    let waUser = await WaUser.findOne({ where: { business_id: businessId, wa_id: waId } });
    const now = new Date();
    if (!waUser) {
      waUser = await WaUser.create({
        business_id: businessId,
        wa_id: waId,
        display_name: displayName,
        first_seen_at: now,
        last_seen_at: now,
      });
    } else {
      await waUser.update({
        display_name: displayName || waUser.display_name,
        last_seen_at: now,
      });
    }
    const session = await whatsappStateService.getOrCreateSession(businessId, waId);
    const text = waPayload.getText(message);
    const interactive = waPayload.getInteractiveResponse(message);

    // İptal sonrası: kullanıcı yazdığında tekrar menüye dön (aksi halde sürekli "İptal edildi" mesajı gider)
    if (session.state === 'CANCELLED') {
      await session.update({ state: 'WELCOME', context_json: {} });
    }

    // Metin komutları (serbest yazı: iptal, menü, baştan, geri, yardım, randevularım)
    const rawText = text ? String(text).trim().toLowerCase() : '';
    if (rawText && !interactive) {
      const settings = await BusinessSettings.findOne({ where: { business_id: businessId } });
      const lang = (settings && settings.whatsapp_lang) ? settings.whatsapp_lang : 'tr';
      const t = getWaT(lang);
      const token = integration.token_encrypted;
      if (session.state === 'DONE') {
        await session.update({ state: 'WELCOME', context_json: {} });
      } else if (['iptal', 'menü', 'menu', 'baştan'].includes(rawText)) {
        await session.update({ state: 'WELCOME', context_json: {} });
      } else if (rawText === 'geri' && PREV_STATE[session.state]) {
        await session.update({ state: PREV_STATE[session.state] });
      } else if (rawText === 'randevularım') {
        await session.update({ state: 'MY_APPOINTMENTS', context_json: whatsappStateService.getContext(session) });
      } else if (['WELCOME', 'EMPLOYEE_SELECT', 'DATE_SELECT', 'TIME_SELECT', 'CONFIRM', 'MY_APPOINTMENTS', 'APPOINTMENT_ACTION', 'CONFIRM_CANCEL_APPOINTMENT', 'QUEUE_CONFIRM'].includes(session.state)) {
        if (token) await sendTextMessage(integration.phone_number_id, token, waId, t('invalid_selection'));
        // Mevcut adım aşağıda sendReplyForState ile gönderilir
      }
      if (rawText) {
        await whatsappReplyService.sendReplyForState(integration, waId, session);
        return res.status(200).send('OK');
      }
    }

    // Randevu akışı (doküman): ÇALIŞAN → TARİH → SAAT → CONFIRM → DONE
    if (session.state === 'WELCOME') {
      if (interactive && (interactive.type === 'button' || interactive.type === 'list')) {
        const menuId = interactive.id;
        if (menuId === 'appointment') {
          const employees = await whatsappStateService.getActiveEmployees(businessId);
          if (employees.length === 0) {
            await session.update({ state: 'WELCOME', context_json: {} });
            const settings = await BusinessSettings.findOne({ where: { business_id: businessId } });
            const lang = (settings && settings.whatsapp_lang) ? settings.whatsapp_lang : 'tr';
            const t = getWaT(lang);
            const token = integration.token_encrypted;
            if (token) await sendTextMessage(integration.phone_number_id, token, waId, t('no_employees'));
          } else {
            await session.update({
              state: 'EMPLOYEE_SELECT',
              context_json: { ...whatsappStateService.getContext(session), intent: 'appointment' },
            });
          }
        } else if (menuId === 'my_appointments') {
          await session.update({ state: 'MY_APPOINTMENTS', context_json: whatsappStateService.getContext(session) });
        } else if (menuId === 'cancel') {
          await session.update({ state: 'CANCELLED', context_json: {} });
        }
      }
    } else if (session.state === 'EMPLOYEE_SELECT' && interactive && interactive.type === 'list') {
      const employeeId = interactive.id ? parseInt(interactive.id, 10) : null;
      const ctx = whatsappStateService.getContext(session);
      if (employeeId) {
        await whatsappStateService.updateContext(session, { selectedEmployeeId: employeeId });
        await session.update({ state: 'DATE_SELECT' });
      }
    } else if (session.state === 'DATE_SELECT' && interactive) {
      if (interactive.type === 'button') {
        if (interactive.id === 'my_appointments') {
          await session.update({ state: 'MY_APPOINTMENTS', context_json: whatsappStateService.getContext(session) });
        } else if (interactive.id === 'other_day') {
          // Zaten DATE_SELECT; sendReplyForState tarih listesini tekrar gönderir
        } else if (interactive.id === 'menu') {
          await session.update({ state: 'WELCOME', context_json: {} });
        }
      } else if (interactive.type === 'list') {
        const dayOffset = interactive.id != null ? parseInt(interactive.id, 10) : NaN;
        if (!Number.isNaN(dayOffset) && dayOffset >= 0 && dayOffset <= whatsappStateService.MAX_DATE_DAYS) {
          const selectedDate = whatsappStateService.dateFromTodayOffset(dayOffset);
          await whatsappStateService.updateContext(session, { selectedDate });
          await session.update({ state: 'TIME_SELECT' });
        }
      }
    } else if (session.state === 'TIME_SELECT' && interactive) {
      if (interactive.type === 'button') {
        if (interactive.id === 'other_day') {
          await session.update({ state: 'DATE_SELECT' });
        } else if (interactive.id === 'other_employee') {
          await session.update({ state: 'EMPLOYEE_SELECT' });
        } else if (interactive.id === 'menu') {
          await session.update({ state: 'WELCOME', context_json: {} });
        }
      } else if (interactive.type === 'list') {
        const raw = interactive.id || interactive.title;
        const isSlotFormat = typeof raw === 'string' && /^\d{1,2}:\d{2}$/.test(raw.trim());
        if (isSlotFormat) {
          await whatsappStateService.updateContext(session, { selectedSlot: raw.trim() });
          await session.update({ state: 'CONFIRM' });
        }
      }
    } else if (session.state === 'CONFIRM' && interactive && (interactive.type === 'list' || interactive.type === 'button')) {
      const confirmChoice = interactive.id;
      if (confirmChoice === 'confirm') {
        const result = await whatsappStateService.createAppointmentFromSession(session, waUser.id);
        if (result.appointment) {
          await session.update({ state: 'DONE', context_json: {} });
          await whatsappReplyService.sendAppointmentResult(integration, waId, result.appointment);
          res.status(200).send('OK');
          return;
        }
        const token = integration.token_encrypted;
        if (token) {
          const settings = await BusinessSettings.findOne({ where: { business_id: businessId } });
          const lang = (settings && settings.whatsapp_lang) ? settings.whatsapp_lang : 'tr';
          const t = getWaT(lang);
          if (result.reason === 'existing_same_day') {
            await session.update({ state: 'DATE_SELECT' });
            await sendTextMessage(integration.phone_number_id, token, waId, t('existing_same_day'));
            const sameDayButtons = [
              { id: 'my_appointments', title: t('same_day_btn_my_appointments') },
              { id: 'other_day', title: t('same_day_btn_other_day') },
              { id: 'menu', title: t('same_day_btn_menu') },
            ];
            await sendInteractiveButtons(integration.phone_number_id, token, waId, t('welcome_list_button'), sameDayButtons);
            return res.status(200).send('OK');
          } else {
            await session.update({ state: 'TIME_SELECT' });
            await sendTextMessage(integration.phone_number_id, token, waId, t('slot_unavailable'));
          }
        } else {
          await session.update({ state: result.reason === 'existing_same_day' ? 'DATE_SELECT' : 'TIME_SELECT' });
        }
      } else if (confirmChoice === 'back_employee') {
        await session.update({ state: 'EMPLOYEE_SELECT' });
      } else if (confirmChoice === 'back_date') {
        await session.update({ state: 'DATE_SELECT' });
      } else if (confirmChoice === 'back_time' || confirmChoice === 'back') {
        await session.update({ state: 'TIME_SELECT' });
      } else if (confirmChoice === 'cancel') {
        await session.update({ state: 'CANCELLED', context_json: {} });
      }
    } else if (session.state === 'MY_APPOINTMENTS' && interactive && interactive.type === 'list') {
      const appointmentId = interactive.id ? String(interactive.id).trim() : null;
      if (appointmentId) {
        await whatsappStateService.updateContext(session, { cancelAppointmentId: appointmentId });
        await session.update({ state: 'APPOINTMENT_ACTION' });
      }
    } else if (session.state === 'APPOINTMENT_ACTION' && interactive && interactive.type === 'button') {
      if (interactive.id === 'cancel_appointment') {
        await session.update({ state: 'CONFIRM_CANCEL_APPOINTMENT' });
      } else if (interactive.id === 'keep') {
        await session.update({ state: 'MY_APPOINTMENTS' });
      } else if (interactive.id === 'exit') {
        await session.update({ state: 'WELCOME', context_json: {} });
      }
    } else if (session.state === 'CONFIRM_CANCEL_APPOINTMENT' && interactive && interactive.type === 'button') {
      if (interactive.id === 'confirm_cancel') {
        const ctx = whatsappStateService.getContext(session);
        const appointmentId = ctx.cancelAppointmentId;
        const token = integration.token_encrypted;
        const settings = await BusinessSettings.findOne({ where: { business_id: businessId } });
        const lang = (settings && settings.whatsapp_lang) ? settings.whatsapp_lang : 'tr';
        const t = getWaT(lang);
        const cancelResult = await whatsappStateService.cancelAppointmentByWaUser(businessId, appointmentId, waId);
        await session.update({ state: 'WELCOME', context_json: {} });
        if (token) {
          if (cancelResult.cancelled) {
            await sendTextMessage(integration.phone_number_id, token, waId, t('appointment_cancelled_success'));
          } else if (cancelResult.messageKey) {
            await sendTextMessage(integration.phone_number_id, token, waId, t(cancelResult.messageKey));
          }
        }
        await whatsappReplyService.sendReplyForState(integration, waId, session);
        return res.status(200).send('OK');
      } else if (interactive.id === 'back') {
        await session.update({ state: 'APPOINTMENT_ACTION' });
      }
    } else if (session.state === 'QUEUE_CONFIRM' && interactive && interactive.type === 'button') {
      if (interactive.id === 'confirm') {
        const entry = await whatsappStateService.createQueueEntryFromSession(session, waUser.id);
        await session.update({ state: 'DONE', context_json: {} });
        await whatsappReplyService.sendQueueResult(integration, waId, entry ? entry.position : null, session.business_id);
        res.status(200).send('OK');
        return;
      } else if (interactive.id === 'cancel') {
        await session.update({ state: 'CANCELLED', context_json: {} });
      }
    }

    await whatsappReplyService.sendReplyForState(integration, waId, session);
    res.status(200).send('OK');
  } catch (err) {
    console.error('[WhatsApp] Webhook işlenirken hata:', err.message, err.code || '', err.meta ? JSON.stringify(err.meta) : '');
    next(err);
  }
}

module.exports = { handleIncoming };
