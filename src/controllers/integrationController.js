const config = require('../config');
const { WhatsappIntegration, Business, WhatsappMessageLog } = require('../models');
const subscriptionService = require('../services/subscriptionService');
const { Op } = require('sequelize');

async function getWhatsapp(req, res, next) {
  try {
    const integration = await WhatsappIntegration.findOne({
      where: { business_id: req.businessId },
    });
    const sub = await subscriptionService.getActiveSubscription(req.businessId);
    const planIncludesWhatsApp = sub ? await subscriptionService.planIncludesWhatsApp(sub.plan_code) : false;
    const subscriptionActive = subscriptionService.isSubscriptionActive(sub);
    const trialEndsAt = sub && sub.trial_ends_at ? sub.trial_ends_at : null;
    const connected = !!integration && integration.status === 'active';
    let display_status = 'not_connected';
    if (connected) {
      if (!planIncludesWhatsApp) display_status = 'not_connected';
      else if (sub && sub.status === 'trial_active' && trialEndsAt) display_status = 'trial';
      else if (subscriptionActive) display_status = 'active';
      else display_status = 'expired';
    } else if (integration && integration.status === 'disconnected') {
      display_status = 'not_connected';
    }
    res.json({
      connected,
      phone_number_id: integration ? integration.phone_number_id : null,
      status: integration ? integration.status : null,
      display_status,
      plan_includes_whatsapp: planIncludesWhatsApp,
      subscription_status: sub ? sub.status : null,
      trial_ends_at: trialEndsAt,
    });
  } catch (err) {
    next(err);
  }
}

async function connectWhatsapp(req, res, next) {
  try {
    await subscriptionService.requireCoreSubscription(req.businessId);
    const canUse = await subscriptionService.canUseWhatsApp(req.businessId);
    if (!canUse) {
      return res.status(403).json({ code: 'plan_required', message: 'WhatsApp planı gerekli' });
    }
    const { phone_number_id, access_code } = req.body;
    if (!phone_number_id) {
      return res.status(400).json({ code: 'validation_error', message: 'phone_number_id zorunlu' });
    }
    if (!access_code) {
      return res.status(400).json({ code: 'validation_error', message: 'access_code zorunlu' });
    }
    const appId = config.whatsapp?.appId;
    const appSecret = config.whatsapp?.appSecret;
    if (!appId || !appSecret) {
      return res.status(500).json({ code: 'config_error', message: 'WhatsApp APP_ID veya APP_SECRET tanımlı değil' });
    }
    const tokenUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('client_secret', appSecret);
    tokenUrl.searchParams.set('code', access_code);
    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok) {
      return res.status(400).json({
        code: 'whatsapp_token_exchange_failed',
        message: tokenData.error?.message || 'Access token alınamadı. Yeniden bağlanmayı deneyin.',
      });
    }
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return res.status(400).json({
        code: 'whatsapp_token_exchange_failed',
        message: 'Access token yanıtı geçersiz.',
      });
    }
    const [integration] = await WhatsappIntegration.findOrCreate({
      where: { business_id: req.businessId },
      defaults: { business_id: req.businessId, phone_number_id, token_encrypted: accessToken, status: 'active' },
    });
    if (!integration.isNewRecord) {
      await integration.update({ phone_number_id, token_encrypted: accessToken, status: 'active' });
    }
    res.json({ connected: true, phone_number_id: integration.phone_number_id });
  } catch (err) {
    next(err);
  }
}

async function disconnectWhatsapp(req, res, next) {
  try {
    const integration = await WhatsappIntegration.findOne({
      where: { business_id: req.businessId },
    });
    if (integration) {
      await integration.update({ status: 'disconnected' });
    }
    res.json({ connected: false });
  } catch (err) {
    next(err);
  }
}

async function testWhatsapp(req, res, next) {
  try {
    await subscriptionService.requireCoreSubscription(req.businessId);
    const canUse = await subscriptionService.canUseWhatsApp(req.businessId);
    if (!canUse) {
      return res.status(403).json({ code: 'plan_required', message: 'WhatsApp planı gerekli' });
    }
    const integration = await WhatsappIntegration.findOne({
      where: { business_id: req.businessId, status: 'active' },
    });
    if (!integration) {
      return res.status(400).json({ code: 'not_connected', message: 'WhatsApp bağlı değil' });
    }
    const token = integration.token_encrypted;
    if (!token) {
      return res.status(400).json({ code: 'no_token', message: 'Bağlantı token\'ı yok; yeniden bağlayın' });
    }
    const { phone } = req.body || {};
    let to = phone;
    if (!to) {
      const business = await Business.findByPk(req.businessId, { attributes: ['phone_e164'] });
      if (!business || !business.phone_e164) {
        return res.status(400).json({ code: 'no_phone', message: 'İşletme telefon numarası tanımlı değil' });
      }
      to = business.phone_e164;
    }
    const { sendTextMessage } = require('../providers/whatsapp/sendMessage');
    try {
      await sendTextMessage(integration.phone_number_id, token, to, 'Test mesajı. Qivio WhatsApp bağlantınız aktiftir.', { businessId: req.businessId });
    } catch (sendErr) {
      const status = sendErr.status || sendErr.statusCode;
      if (status === 401) {
        await integration.update({ status: 'disconnected' });
        return res.status(400).json({
          code: 'whatsapp_token_invalid',
          message: 'WhatsApp erişim token\'ı geçersiz veya süresi dolmuş. Yeniden bağlanın.',
        });
      }
      if (status >= 400 && status < 500) {
        return res.status(400).json({
          code: 'whatsapp_api_error',
          message: sendErr.message || 'WhatsApp API hatası. Bağlantıyı kontrol edin.',
        });
      }
      throw sendErr;
    }
    res.json({ success: true, message: 'Test mesajı gönderildi' });
  } catch (err) {
    next(err);
  }
}

async function getWhatsappMessageLogs(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const fromDate = req.query.from_date ? new Date(req.query.from_date) : null;
    const toDate = req.query.to_date ? new Date(req.query.to_date) : null;

    const where = { business_id: req.businessId };
    const dateCond = {};
    if (fromDate && !Number.isNaN(fromDate.getTime())) dateCond[Op.gte] = fromDate;
    if (toDate && !Number.isNaN(toDate.getTime())) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      dateCond[Op.lte] = endOfDay;
    }
    if (Object.keys(dateCond).length) where.created_at = dateCond;

    const { count, rows } = await WhatsappMessageLog.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset: (page - 1) * limit,
      attributes: ['id', 'business_id', 'direction', 'message_id', 'phone_wa_id', 'message_type', 'message_body', 'created_at'],
    });

    const items = rows.map((row) => ({
      id: row.id,
      business_id: row.business_id,
      direction: row.direction,
      message_id: row.message_id,
      phone_wa_id: row.phone_wa_id,
      message_type: row.message_type,
      message_body: row.message_body,
      created_at: row.created_at,
    }));

    res.json({
      items,
      total: count,
      page,
      limit,
      total_pages: Math.ceil(count / limit) || 1,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getWhatsapp, connectWhatsapp, disconnectWhatsapp, testWhatsapp, getWhatsappMessageLogs };
