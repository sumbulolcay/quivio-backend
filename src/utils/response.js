const { translate } = require('../i18n');

function sendError(req, res, status, code, defaultMessage) {
  const lang = req.lang || 'tr';
  const message = translate(lang, code, defaultMessage);
  return res.status(status).json({ code, message });
}

module.exports = { sendError };

