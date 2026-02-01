const config = require('../../config');

let provider = null;

function getSmsProvider() {
  if (provider) return provider;
  const name = config.sms.provider || 'twilio';
  if (name === 'twilio') {
    provider = require('./twilio');
  } else {
    throw new Error(`SMS provider not implemented: ${name}`);
  }
  return provider;
}

async function sendOtp(phoneE164, message) {
  const p = getSmsProvider();
  return p.sendOtp(phoneE164, message);
}

module.exports = { sendOtp, getSmsProvider };
