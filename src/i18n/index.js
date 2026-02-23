const en = require('./en');
const tr = require('./tr');

const maps = {
  tr,
  en,
};

function translate(lang, code, fallbackMessage) {
  const dict = maps[lang] || tr;
  return dict[code] || fallbackMessage;
}

module.exports = { translate };

