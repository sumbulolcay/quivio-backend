require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,

  database: {
    url: process.env.DATABASE_URL,
    alter: process.env.SEQUELIZE_ALTER === 'true',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
    expiresIn: '7d',
  },

  cookie: {
    secret: process.env.COOKIE_SECRET || 'dev-cookie-secret-change-in-production',
    name: 'customer_session',
    maxAgeDays: 180,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },

  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:3000',

  recaptcha: {
    enabled: process.env.RECAPTCHA_ENABLED !== 'false',
    secretKey: process.env.RECAPTCHA_SECRET_KEY,
    minScore: parseFloat(process.env.RECAPTCHA_MIN_SCORE) || 0.5,
    verifyUrl: 'https://www.google.com/recaptcha/api/siteverify',
  },

  payment: {
    enabled: process.env.PAYMENT_ENABLED !== 'false',
    provider: process.env.PAYMENT_PROVIDER || 'paytr',
    paytr: {
      merchantId: process.env.PAYTR_MERCHANT_ID,
      merchantKey: process.env.PAYTR_MERCHANT_KEY,
      merchantSalt: process.env.PAYTR_MERCHANT_SALT,
    },
    iyzico: {
      apiKey: process.env.IYZICO_API_KEY,
      secretKey: process.env.IYZICO_SECRET_KEY,
      baseUrl: process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com',
    },
  },

  sms: {
    provider: process.env.SMS_PROVIDER || 'twilio',
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_FROM_NUMBER,
    },
  },

  whatsapp: {
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    appSecret: process.env.WHATSAPP_APP_SECRET,
    sessionTtlMinutes: 15,
  },

  otp: {
    ttlMinutes: 5,
    length: 6,
    maxAttempts: 5,
  },
};
