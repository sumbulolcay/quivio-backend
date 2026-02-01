const config = require('../config');
const { OtpChallenge, Customer } = require('../models');
const { hashOtp, compareOtp } = require('../utils/hash');
const { addMinutes } = require('../utils/time');
const smsProvider = require('../providers/sms');
const crypto = require('crypto');

const TTL_MINUTES = config.otp.ttlMinutes;
const OTP_LENGTH = config.otp.length;
const MAX_ATTEMPTS = config.otp.maxAttempts;

function generateOtp() {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  return otp;
}

async function startOtp(businessId, phoneE164) {
  const existing = await OtpChallenge.findOne({
    where: {
      business_id: businessId,
      phone_e164: phoneE164,
      channel: 'web',
      consumed_at: null,
      expires_at: { [require('sequelize').Op.gt]: new Date() },
    },
    order: [['id', 'DESC']],
  });
  if (existing) {
    const ttlSeconds = Math.max(0, Math.floor((new Date(existing.expires_at) - new Date()) / 1000));
    return { cooldown: true, ttlSeconds };
  }

  const otp = generateOtp();
  if (config.env !== 'production') {
    console.log('[OTP]', phoneE164, '->', otp);
  }
  const otpHash = await hashOtp(otp);
  const expiresAt = addMinutes(TTL_MINUTES);

  await OtpChallenge.create({
    business_id: businessId,
    phone_e164: phoneE164,
    otp_hash: otpHash,
    expires_at: expiresAt,
    attempts: 0,
    channel: 'web',
  });

  const message = `Qivio doğrulama kodunuz: ${otp}. ${TTL_MINUTES} dakika geçerlidir.`;
  await smsProvider.sendOtp(phoneE164, message);

  return { cooldown: false, ttlSeconds: TTL_MINUTES * 60 };
}

async function verifyOtp(businessId, phoneE164, code) {
  const challenge = await OtpChallenge.findOne({
    where: {
      business_id: businessId,
      phone_e164: phoneE164,
      channel: 'web',
      consumed_at: null,
    },
    order: [['id', 'DESC']],
  });
  if (!challenge) {
    const err = new Error('OTP talebi bulunamadı veya süresi doldu');
    err.code = 'otp_invalid';
    err.status = 400;
    throw err;
  }
  if (new Date() > new Date(challenge.expires_at)) {
    const err = new Error('OTP süresi doldu');
    err.code = 'otp_expired';
    err.status = 400;
    throw err;
  }
  if (challenge.attempts >= MAX_ATTEMPTS) {
    const err = new Error('Maksimum deneme aşımı');
    err.code = 'otp_max_attempts';
    err.status = 400;
    throw err;
  }

  await challenge.update({ attempts: challenge.attempts + 1 });
  const valid = await compareOtp(code, challenge.otp_hash);
  if (!valid) {
    const err = new Error('Geçersiz OTP');
    err.code = 'otp_invalid';
    err.status = 400;
    throw err;
  }

  await challenge.update({ consumed_at: new Date() });

  let customer = await Customer.findOne({
    where: { business_id: businessId, phone_e164: phoneE164 },
  });
  if (!customer) {
    customer = await Customer.create({
      business_id: businessId,
      phone_e164: phoneE164,
      verified_at: new Date(),
    });
  } else {
    await customer.update({ verified_at: new Date() });
  }

  return { customer };
}

module.exports = {
  startOtp,
  verifyOtp,
  generateOtp,
};
