const config = require('../config');

function langMiddleware(req, res, next) {
  const cookieLang = req.cookies && req.cookies.lang;
  const supported = (config.i18n && config.i18n.supportedLangs) || ['en', 'tr'];
  const defaultLang = (config.i18n && config.i18n.defaultLang) || 'en';
  req.lang = supported.includes(cookieLang) ? cookieLang : defaultLang;
  next();
}

module.exports = { langMiddleware };

