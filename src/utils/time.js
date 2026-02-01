/**
 * YYYY-MM-DD formatında bugünün tarihi (local).
 */
function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/**
 * Verilen tarihe göre yarının YYYY-MM-DD.
 */
function tomorrowISO(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Dakika cinsinden süreyi milisaniyeye çevirir.
 */
function minutesToMs(minutes) {
  return minutes * 60 * 1000;
}

/**
 * Şu andan itibaren N dakika sonrasının Date objesi.
 */
function addMinutes(minutes) {
  const d = new Date();
  d.setTime(d.getTime() + minutesToMs(minutes));
  return d;
}

/**
 * İki tarih aynı gün mü (YYYY-MM-DD).
 */
function isSameDay(iso1, iso2) {
  return String(iso1).slice(0, 10) === String(iso2).slice(0, 10);
}

module.exports = {
  todayISO,
  tomorrowISO,
  minutesToMs,
  addMinutes,
  isSameDay,
};
