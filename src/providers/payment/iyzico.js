const config = require('../../config');

const cfg = config.payment.iyzico || {};

function createCheckoutPayload(params) {
  const { apiKey, secretKey, baseUrl } = cfg;
  if (!apiKey || !secretKey) {
    throw new Error('iyzico credentials not configured');
  }
  return {
    locale: params.locale || 'tr',
    conversationId: params.conversationId || `conv_${Date.now()}`,
    price: String(params.amount || 0),
    paidPrice: String(params.amount || 0),
    currency: params.currency || 'TRY',
    basketId: params.merchantOid || `oid_${Date.now()}`,
    paymentGroup: 'SUBSCRIPTION',
    callbackUrl: params.successUrl || '',
    enabledInstallments: params.enabledInstallments || [1],
    buyer: params.buyer || {},
    shippingAddress: params.shippingAddress || {},
    billingAddress: params.billingAddress || {},
    basketItems: params.basketItems || [],
  };
}

function verifyCallbackPayload(body) {
  return {
    valid: body.status === 'success',
    merchantOid: body.basketId,
    status: body.status,
    payload: body,
  };
}

module.exports = {
  createCheckoutPayload,
  verifyCallbackPayload,
};
