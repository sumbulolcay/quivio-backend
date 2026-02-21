/**
 * WhatsApp Cloud API ile tek bir mesaj gönderir.
 * @param {string} phoneNumberId - Meta phone_number_id
 * @param {string} accessToken - Meta access token
 * @param {string} to - Alıcı numara E.164 (+ olmadan, örn. 905551234567)
 * @param {string} text - Mesaj metni
 */
async function sendTextMessage(phoneNumberId, accessToken, to, text) {
  const toClean = String(to).replace(/\D/g, '');
  if (!toClean.length) {
    const err = new Error('Geçersiz alıcı numarası');
    err.code = 'invalid_to';
    throw err;
  }
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toClean,
      type: 'text',
      text: { body: text },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || `WhatsApp API ${res.status}`);
    err.code = 'whatsapp_send_failed';
    err.status = res.status;
    err.meta = data.error;
    throw err;
  }
  return data;
}

module.exports = { sendTextMessage };
