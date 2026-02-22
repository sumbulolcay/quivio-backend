const config = require('../config');
const https = require('https');

async function verifyRecaptcha(token) {
  if (!config.recaptcha.secretKey) {
    return { success: false, error: 'recaptcha_not_configured' };
  }
  return new Promise((resolve) => {
    const data = new URLSearchParams({
      secret: config.recaptcha.secretKey,
      response: token,
    }).toString();
    const u = new URL(config.recaptcha.verifyUrl);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({
            success: json.success === true,
            score: json.score,
            action: json.action,
            error: json['error-codes'],
          });
        } catch {
          resolve({ success: false, error: 'parse_error' });
        }
      });
    });
    req.on('error', () => resolve({ success: false, error: 'request_error' }));
    req.write(data);
    req.end();
  });
}

function recaptchaMiddleware(req, res, next) {
  if (!config.recaptcha.enabled) {
    return next();
  }
  const token = req.body.recaptchaToken || req.body.recaptcha_token || req.headers['x-recaptcha-token'];
  if (!token) {
    return res.status(400).json({ code: 'recaptcha_failed', message: 'reCAPTCHA token gerekli' });
  }
  verifyRecaptcha(token).then((result) => {
    console.log("recaptcha result", result);
    if (!result.success) {
      return res.status(429).json({ code: 'recaptcha_failed', message: 'reCAPTCHA doğrulaması başarısız' });
    }
    const minScore = config.recaptcha.minScore;
    if (typeof result.score === 'number' && result.score < minScore) {
      return res.status(429).json({ code: 'recaptcha_failed', message: 'reCAPTCHA skoru yetersiz' });
    }
    req.recaptchaResult = result;
    next();
  }).catch((err) => next(err));
}

module.exports = {
  verifyRecaptcha,
  recaptchaMiddleware,
};
