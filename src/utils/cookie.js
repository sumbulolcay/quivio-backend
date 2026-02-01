const config = require('../config');
const crypto = require('crypto');

const COOKIE_NAME = config.cookie.name;
const SECRET = config.cookie.secret;
const MAX_AGE_DAYS = config.cookie.maxAgeDays;

function sign(value) {
  const payload = JSON.stringify(value);
  const hmac = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, sig: hmac })).toString('base64url');
}

function unsign(signed) {
  if (!signed) return null;
  try {
    const raw = Buffer.from(signed, 'base64url').toString('utf8');
    const { payload, sig } = JSON.parse(raw);
    const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
    if (sig !== expected) return null;
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function getOptions() {
  const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  return {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    maxAge: maxAgeMs,
    path: '/',
  };
}

function setCustomerSession(res, data) {
  const value = {
    businessId: data.businessId,
    customerId: data.customerId,
    phoneHash: data.phoneHash,
    verifiedAt: data.verifiedAt,
    exp: data.exp || Math.floor(Date.now() / 1000) + MAX_AGE_DAYS * 86400,
  };
  res.cookie(COOKIE_NAME, sign(value), getOptions());
}

function getCustomerSession(req) {
  const raw = req.cookies && req.cookies[COOKIE_NAME];
  return unsign(raw);
}

function clearCustomerSession(res) {
  res.clearCookie(COOKIE_NAME, { path: '/', httpOnly: true });
}

module.exports = {
  sign,
  unsign,
  getOptions,
  setCustomerSession,
  getCustomerSession,
  clearCustomerSession,
  COOKIE_NAME,
};
