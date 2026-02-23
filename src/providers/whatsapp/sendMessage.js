const toClean = (to) => {
  const s = String(to).replace(/\D/g, '');
  if (!s.length) {
    const err = new Error('Geçersiz alıcı numarası');
    err.code = 'invalid_to';
    throw err;
  }
  return s;
};

async function request(phoneNumberId, accessToken, to, body) {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toClean(to),
      ...body,
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

/**
 * WhatsApp Cloud API ile tek bir metin mesajı gönderir.
 */
async function sendTextMessage(phoneNumberId, accessToken, to, text) {
  return request(phoneNumberId, accessToken, to, {
    type: 'text',
    text: { body: text },
  });
}

/**
 * İnteraktif buton mesajı (en fazla 3 buton).
 * @param {Array<{id: string, title: string}>} buttons - id max 256, title max 20 karakter
 */
async function sendInteractiveButtons(phoneNumberId, accessToken, to, bodyText, buttons) {
  return request(phoneNumberId, accessToken, to, {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: { id: String(b.id).slice(0, 256), title: String(b.title).slice(0, 20) },
        })),
      },
    },
  });
}

/**
 * İnteraktif liste mesajı.
 * @param {string} buttonLabel - Liste buton etiketi (max 20 karakter)
 * @param {Array<{title: string, rows: Array<{id: string, title: string}>}>} sections - section title max 24, row id max 200, row title max 24
 */
async function sendInteractiveList(phoneNumberId, accessToken, to, bodyText, buttonLabel, sections) {
  return request(phoneNumberId, accessToken, to, {
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: bodyText },
      action: {
        button: String(buttonLabel).slice(0, 20),
        sections: sections.slice(0, 10).map((sec) => ({
          title: String(sec.title || '').slice(0, 24),
          rows: (sec.rows || []).slice(0, 10).map((r) => ({
            id: String(r.id).slice(0, 200),
            title: String(r.title || r.id).slice(0, 24),
          })),
        })),
      },
    },
  });
}

module.exports = { sendTextMessage, sendInteractiveButtons, sendInteractiveList };
