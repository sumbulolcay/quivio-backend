const { WhatsappMessageLog, WaUser, BookingSettings, BusinessSettings } = require('../models');
const waPayload = require('../utils/waPayload');
const whatsappStateService = require('../services/whatsappStateService');
const whatsappReplyService = require('../services/whatsappReplyService');
const subscriptionService = require('../services/subscriptionService');
const { sendTextMessage } = require('../providers/whatsapp/sendMessage');
const { getWaT } = require('../i18n/wa');

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
      return res.status(200).send('OK');
    }
    const businessId = integration.business_id;
    const canUse = await subscriptionService.canUseWhatsApp(businessId);
    if (!canUse) {
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

    // Randevu akışı: WELCOME → DATE_SELECT → EMPLOYEE_SELECT → TIME_SELECT → CONFIRM → DONE
    if (session.state === 'WELCOME') {
      if (interactive && interactive.type === 'button') {
        if (interactive.id === 'appointment') {
          await session.update({
            state: 'DATE_SELECT',
            context_json: { ...whatsappStateService.getContext(session), intent: 'appointment' },
          });
        } else if (interactive.id === 'queue') {
          const bookingSettings = await BookingSettings.findOne({ where: { business_id: businessId } });
          const queueRequiresEmployee = bookingSettings && bookingSettings.queue_requires_employee;
          await session.update({
            state: queueRequiresEmployee ? 'EMPLOYEE_SELECT' : 'QUEUE_CONFIRM',
            context_json: { ...whatsappStateService.getContext(session), intent: 'queue' },
          });
        } else if (interactive.id === 'cancel') {
          await session.update({ state: 'CANCELLED', context_json: {} });
        }
      }
    } else if (session.state === 'DATE_SELECT' && interactive && interactive.type === 'list') {
      const dayOffset = interactive.id != null ? parseInt(interactive.id, 10) : NaN;
      if (!Number.isNaN(dayOffset) && dayOffset >= 0 && dayOffset <= whatsappStateService.MAX_DATE_DAYS) {
        const selectedDate = whatsappStateService.dateFromTodayOffset(dayOffset);
        await whatsappStateService.updateContext(session, { selectedDate });
        await session.update({ state: 'EMPLOYEE_SELECT' });
      }
    } else if (session.state === 'EMPLOYEE_SELECT' && interactive && interactive.type === 'list') {
      const employeeId = interactive.id ? parseInt(interactive.id, 10) : null;
      const ctx = whatsappStateService.getContext(session);
      if (employeeId) {
        await whatsappStateService.updateContext(session, { selectedEmployeeId: employeeId });
        await session.update({
          state: ctx.intent === 'queue' ? 'QUEUE_CONFIRM' : 'TIME_SELECT',
        });
      }
    } else if (session.state === 'TIME_SELECT' && interactive && interactive.type === 'list') {
      const slot = interactive.id || interactive.title;
      if (slot) {
        await whatsappStateService.updateContext(session, { selectedSlot: slot });
        await session.update({ state: 'CONFIRM' });
      }
    } else if (session.state === 'CONFIRM' && interactive && interactive.type === 'button') {
      if (interactive.id === 'confirm') {
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
          } else {
            await session.update({ state: 'TIME_SELECT' });
            await sendTextMessage(integration.phone_number_id, token, waId, t('slot_unavailable'));
          }
        } else {
          await session.update({ state: result.reason === 'existing_same_day' ? 'DATE_SELECT' : 'TIME_SELECT' });
        }
      } else if (interactive.id === 'back') {
        await session.update({ state: 'TIME_SELECT' });
      } else if (interactive.id === 'cancel') {
        await session.update({ state: 'CANCELLED', context_json: {} });
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
    next(err);
  }
}

module.exports = { handleIncoming };
