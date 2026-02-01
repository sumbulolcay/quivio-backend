/**
 * Global error handler. Tüm hatalar { code, message, details? } formatında döner.
 * Secrets loglanmaz.
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const code = err.code || 'internal_error';
  const message = err.message || 'Beklenmeyen bir hata oluştu';
  const status = err.status || err.statusCode || 500;
  const details = err.details;

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
