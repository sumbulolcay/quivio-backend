const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/response');

const OTP_WINDOW_MS = 5 * 60 * 1000;
const OTP_MAX_PER_KEY = 3;
const WHATSAPP_WINDOW_MS = 60 * 1000;
const WHATSAPP_MAX_PER_KEY = 30;

function otpLimiterKey(req) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const phone = (req.body && req.body.phone_e164) ? req.body.phone_e164 : '';
  return `otp:${ip}:${phone}`;
}

const otpLimiter = rateLimit({
  windowMs: OTP_WINDOW_MS,
  max: OTP_MAX_PER_KEY,
  keyGenerator: otpLimiterKey,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res /*, next */) =>
    sendError(req, res, 429, 'rate_limit_exceeded', 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin.'),
});

const whatsappLimiter = rateLimit({
  windowMs: WHATSAPP_WINDOW_MS,
  max: WHATSAPP_MAX_PER_KEY,
  keyGenerator: (req) => {
    const waId = req.body && req.body.entry && req.body.entry[0] && req.body.entry[0].changes
      && req.body.entry[0].changes[0] && req.body.entry[0].changes[0].value
      && req.body.entry[0].changes[0].value.messages
      && req.body.entry[0].changes[0].value.messages[0]
      ? req.body.entry[0].changes[0].value.messages[0].from
      : req.ip;
    return `wa:${waId}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res /*, next */) =>
    sendError(req, res, 429, 'rate_limit_exceeded', 'Çok fazla istek.'),
});

module.exports = {
  otpLimiter,
  whatsappLimiter,
};
