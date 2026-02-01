/**
 * Türkiye telefon numarasını E.164 formatına normalize eder.
 * Başında 0 veya +90 olan numaralar +90... olarak döner.
 * @param {string} input
 * @returns {string|null} +90XXXXXXXXX veya null
 */
function normalizeE164(input) {
  if (!input || typeof input !== 'string') return null;
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('5')) {
    return '+90' + digits;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return '+90' + digits.slice(1);
  }
  if (digits.length === 12 && digits.startsWith('90')) {
    return '+' + digits;
  }
  return null;
}

function isValidE164(phone) {
  if (!phone || typeof phone !== 'string') return false;
  return /^\+90[0-9]{10}$/.test(phone);
}

module.exports = {
  normalizeE164,
  isValidE164,
};
