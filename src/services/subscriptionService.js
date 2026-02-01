const { Subscription, Plan } = require('../models');
const { Op } = require('sequelize');

const ALLOWED_STATUSES = ['active', 'trial_active'];

async function getActiveSubscription(businessId) {
  const sub = await Subscription.findOne({
    where: { business_id: businessId },
    order: [['id', 'DESC']],
  });
  if (!sub) return null;
  return sub;
}

function isSubscriptionActive(sub) {
  if (!sub) return false;
  if (ALLOWED_STATUSES.includes(sub.status)) {
    if (sub.status === 'trial_active' && sub.trial_ends_at) {
      return new Date(sub.trial_ends_at) > new Date();
    }
    return true;
  }
  return false;
}

async function requireCoreSubscription(businessId) {
  const sub = await getActiveSubscription(businessId);
  if (!isSubscriptionActive(sub)) {
    const err = new Error('Abonelik aktif değil veya süresi doldu');
    err.code = 'subscription_required';
    err.status = 403;
    throw err;
  }
  return sub;
}

async function planIncludesWhatsApp(planCode) {
  const plan = await Plan.findOne({ where: { code: planCode, is_active: true } });
  return plan ? !!plan.includes_whatsapp : false;
}

async function canUseWhatsApp(businessId) {
  const sub = await getActiveSubscription(businessId);
  if (!isSubscriptionActive(sub)) return false;
  return planIncludesWhatsApp(sub.plan_code);
}

module.exports = {
  getActiveSubscription,
  isSubscriptionActive,
  requireCoreSubscription,
  planIncludesWhatsApp,
  canUseWhatsApp,
};
