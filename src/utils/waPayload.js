/**
 * WhatsApp webhook payload'ından phone_number_id ve mesaj bilgilerini çıkarır.
 * Cloud API formatı: entry[].changes[].value.metadata.phone_number_id, messages, contacts
 */

function getPhoneNumberId(body) {
  const entry = body.entry && body.entry[0];
  const changes = entry && entry.changes && entry.changes[0];
  const value = changes && changes.value;
  return value && value.metadata && value.metadata.phone_number_id;
}

function getMessage(body) {
  const entry = body.entry && body.entry[0];
  const changes = entry && entry.changes && entry.changes[0];
  const value = changes && changes.value;
  const messages = value && value.messages;
  if (!messages || !messages[0]) return null;
  return messages[0];
}

function getMessageId(message) {
  return message && message.id;
}

function getFromWaId(message) {
  return message && message.from;
}

function getContactProfile(value) {
  const contacts = value && value.contacts;
  if (!contacts || !contacts[0]) return null;
  return contacts[0];
}

function getText(message) {
  const text = message && message.text;
  return text && text.body ? text.body.trim() : null;
}

function getInteractiveResponse(message) {
  const interactive = message && message.interactive;
  if (!interactive) return null;
  const type = interactive.type;
  if (type === 'button_reply') {
    return { type: 'button', id: interactive.button_reply?.id, title: interactive.button_reply?.title };
  }
  if (type === 'list_reply') {
    return { type: 'list', id: interactive.list_reply?.id, title: interactive.list_reply?.title, description: interactive.list_reply?.description };
  }
  return null;
}

function getValueFromPayload(body) {
  const entry = body.entry && body.entry[0];
  const changes = entry && entry.changes && entry.changes[0];
  return changes && changes.value;
}

module.exports = {
  getPhoneNumberId,
  getMessage,
  getMessageId,
  getFromWaId,
  getContactProfile,
  getText,
  getInteractiveResponse,
  getValueFromPayload,
};
