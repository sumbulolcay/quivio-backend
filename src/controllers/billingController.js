const { Subscription, Plan, SubscriptionEvent } = require('../models');
const subscriptionService = require('../services/subscriptionService');
const { getPaymentProvider } = require('../providers/payment');
const config = require('../config');

async function getSubscription(req, res, next) {
  try {
    const sub = await subscriptionService.getActiveSubscription(req.businessId);
    const plan = sub ? await Plan.findOne({ where: { code: sub.plan_code } }) : null;
    res.json({
      subscription: sub ? {
        id: sub.id,
        plan_code: sub.plan_code,
        status: sub.status,
        trial_ends_at: sub.trial_ends_at,
        current_period_end: sub.current_period_end,
      } : null,
      plan: plan ? { code: plan.code, name: plan.name, includes_whatsapp: plan.includes_whatsapp } : null,
    });
  } catch (err) {
    next(err);
  }
}

async function startTrial(req, res, next) {
  try {
    let sub = await subscriptionService.getActiveSubscription(req.businessId);
    if (sub && subscriptionService.isSubscriptionActive(sub)) {
      return res.status(400).json({ code: 'already_active', message: 'Zaten aktif abonelik var' });
    }
    const planCode = req.body.plan_code || 'core';
    const plan = await Plan.findOne({ where: { code: planCode, is_active: true } });
    if (!plan) {
      return res.status(400).json({ code: 'invalid_plan', message: 'Geçersiz plan' });
    }
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);
    sub = await Subscription.create({
      business_id: req.businessId,
      plan_code: planCode,
      status: 'trial_active',
      trial_ends_at: trialEndsAt,
    });
    res.status(201).json({
      subscription: { id: sub.id, plan_code: sub.plan_code, status: sub.status, trial_ends_at: sub.trial_ends_at },
    });
  } catch (err) {
    next(err);
  }
}

async function checkout(req, res, next) {
  try {
    if (!config.payment.enabled) {
      return res.status(503).json({ code: 'payment_disabled', message: 'Ödeme sistemi şu an kapalı' });
    }
    const business = req.business;
    const { plan_code, success_url, fail_url } = req.body;
    const plan = await Plan.findOne({ where: { code: plan_code || 'core', is_active: true } });
    if (!plan) {
      return res.status(400).json({ code: 'invalid_plan', message: 'Geçersiz plan' });
    }
    const provider = getPaymentProvider();
    const baseUrl = config.publicBaseUrl;
    const params = {
      merchantOid: `sub_${business.id}_${Date.now()}`,
      amount: plan.price_json && plan.price_json.amount ? plan.price_json.amount : 99,
      successUrl: success_url || `${baseUrl}/billing/success`,
      failUrl: fail_url || `${baseUrl}/billing/fail`,
      userName: business.name,
      userPhone: '',
      email: business.email,
      basket: [{ name: plan.name, price: plan.price_json?.amount || 99, quantity: 1 }],
    };
    const payload = provider.createCheckoutPayload(params);
    res.json({ payload, provider: config.payment.provider });
  } catch (err) {
    next(err);
  }
}

async function webhookPaytr(req, res, next) {
  try {
    if (!config.payment.enabled) {
      return res.status(503).send('OK');
    }
    const provider = getPaymentProvider();
    const result = provider.verifyCallbackPayload(req.body);
    if (!result.valid) {
      return res.status(400).send('FAIL');
    }
    const merchantOid = result.merchantOid;
    const match = merchantOid && merchantOid.match(/^sub_(\d+)_/);
    if (match) {
      const businessId = parseInt(match[1], 10);
      const sub = await Subscription.findOne({ where: { business_id: businessId }, order: [['id', 'DESC']] });
      if (sub) {
        await SubscriptionEvent.create({
          subscription_id: sub.id,
          type: 'payment_callback',
          payload_json: req.body,
        });
      }
    }
    res.send('OK');
  } catch (err) {
    next(err);
  }
}

async function webhookIyzico(req, res, next) {
  try {
    if (!config.payment.enabled) {
      return res.status(503).json({ status: 'disabled' });
    }
    const provider = getPaymentProvider();
    const result = provider.verifyCallbackPayload(req.body);
    if (!result.valid) {
      return res.status(400).json({ error: 'invalid' });
    }
    res.json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSubscription,
  startTrial,
  checkout,
  webhookPaytr,
  webhookIyzico,
};
