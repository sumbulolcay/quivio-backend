const config = require('../../config');
const crypto = require('crypto');

const cfg = config.payment.paytr || {};

function createCheckoutPayload(params) {
  const { merchantId, merchantKey, merchantSalt } = cfg;
  if (!merchantId || !merchantKey || !merchantSalt) {
    throw new Error('PayTR credentials not configured');
  }
  const merchant_oid = params.merchantOid || `oid_${Date.now()}`;
  const email = params.email || '';
  const payment_amount = Math.round((params.amount || 0) * 100) / 100;
  const user_basket = Buffer.from(JSON.stringify(params.basket || [])).toString('base64');
  const no_installment = params.noInstallment ? 1 : 0;
  const max_installment = params.maxInstallment || 0;
  const user_ip = params.userIp || '127.0.0.1';
  const merchant_ok_url = params.successUrl || '';
  const merchant_fail_url = params.failUrl || '';
  const user_name = params.userName || '';
  const user_phone = params.userPhone || '';
  const user_address = params.userAddress || '';
  const timeout_limit = params.timeoutLimit || 30;
  const debug = config.env === 'development' ? '1' : '0';
  const currency = params.currency || 'TL';
  const test_mode = config.env === 'production' ? '0' : '1';

  const hash_str = `${merchantId}${user_ip}${merchant_oid}${email}${payment_amount}${user_basket}${no_installment}${max_installment}${currency}${test_mode}${merchantSalt}`;
  const paytr_token = crypto.createHmac('sha256', merchantKey).update(hash_str).digest('base64');

  return {
    merchant_id: merchantId,
    user_ip,
    merchant_oid,
    email,
    payment_amount,
    paytr_token,
    user_basket,
    no_installment,
    max_installment,
    currency,
    test_mode,
    merchant_ok_url,
    merchant_fail_url,
    user_name,
    user_phone,
    user_address,
    timeout_limit,
    debug,
  };
}

function verifyCallbackPayload(body) {
  const { merchantKey, merchantSalt } = cfg;
  const hash = body.hash;
  if (!hash) return { valid: false };
  const expected = crypto.createHmac('sha256', merchantKey).update(
    body.merchant_oid + merchantSalt + body.status + body.total_amount + body.hash_str + merchantSalt
  ).digest('base64');
  if (hash !== expected) return { valid: false };
  return {
    valid: true,
    merchantOid: body.merchant_oid,
    status: body.status,
    totalAmount: parseFloat(body.total_amount),
    payload: body,
  };
}

module.exports = {
  createCheckoutPayload,
  verifyCallbackPayload,
};
