const { translate } = require('../i18n');
const config = require('../config');

/**
 * Global error handler. Tüm hatalar { code, message, details? } formatında döner.
 * Secrets loglanmaz. Mesajlar req.lang'e göre çevrilir.
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const code = err.code || 'internal_error';
  const defaultMessage = err.message || 'Beklenmeyen bir hata oluştu';
  const status = err.status || err.statusCode || 500;
  const details = err.details;

  const defaultLang = (config.i18n && config.i18n.defaultLang) || 'en';
  const lang = (req && req.lang) || defaultLang;
  const message = translate(lang, code, defaultMessage);

  if (status >= 500) {
    console.error('[error]', code, message);
    if (err.stack && process.env.NODE_ENV === 'development') {
      console.error(err.stack);
    }
  }

  res.status(status).json({
    code,
    message,
    ...(details && { details }),
  });
}

module.exports = errorHandler;
