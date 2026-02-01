const { WhatsappIntegration } = require('../models');
const subscriptionService = require('../services/subscriptionService');

async function getWhatsapp(req, res, next) {
  try {
    await subscriptionService.requireCoreSubscription(req.businessId);
    const integration = await WhatsappIntegration.findOne({
      where: { business_id: req.businessId },
    });
    res.json({
      connected: !!integration && integration.status === 'active',
      phone_number_id: integration ? integration.phone_number_id : null,
      status: integration ? integration.status : null,
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
    const { phone_number_id, token } = req.body;
    if (!phone_number_id) {
      return res.status(400).json({ code: 'validation_error', message: 'phone_number_id zorunlu' });
    }
    const [integration] = await WhatsappIntegration.findOrCreate({
      where: { business_id: req.businessId },
      defaults: { business_id: req.businessId, phone_number_id, token_encrypted: token || null, status: 'active' },
    });
    if (!integration.isNewRecord) {
      await integration.update({ phone_number_id, token_encrypted: token || integration.token_encrypted, status: 'active' });
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

module.exports = { getWhatsapp, connectWhatsapp, disconnectWhatsapp };
