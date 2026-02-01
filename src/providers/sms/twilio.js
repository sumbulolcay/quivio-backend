const config = require('../../config');
const twilio = require('twilio');

let client = null;

function getClient() {
  if (!client) {
    const { accountSid, authToken } = config.sms.twilio;
    if (!accountSid || !authToken) throw new Error('Twilio credentials not configured');
    client = twilio(accountSid, authToken);
  }
  return client;
}

async function sendOtp(phoneE164, message) {
  const c = getClient();
  await c.messages.create({
    body: message,
    from: config.sms.twilio.fromNumber,
    to: phoneE164,
  });
}

module.exports = { sendOtp };
