/**
 * WhatsApp akışı mesajları. Tek dil seçilir (işletme ayarı whatsapp_lang).
 * getWaT(lang) ile metin alınır; employee_selection_label işletme ayarından gelir.
 */
const messages = {
  tr: {
    welcome_body: 'Ne yapmak istersiniz?',
    welcome_btn_appointment: 'Randevu al',
    welcome_btn_queue: 'Sıraya gir',
    welcome_btn_cancel: 'İptal',
    date_select_body: 'Hangi gün?',
    date_select_button: 'Tarih seç',
    date_section_title: 'Tarih',
    employee_select_body: 'Hangi çalışan?',
    employee_select_button: 'Çalışan seç',
    employees_section_title: 'Çalışanlar',
    time_select_body: 'Hangi saat?',
    time_select_button: 'Saat seç',
    time_section_title: 'Müsait saatler',
    time_select_no_slots: 'Bu gün için müsait saat bulunamadı. Lütfen başka bir gün veya çalışan seçin.',
    confirm_btn_confirm: 'Onayla',
    confirm_btn_back: 'Geri',
    confirm_btn_cancel: 'İptal',
    confirm_summary_prefix: 'Randevu özeti:',
    confirm_summary_day: 'Gün',
    confirm_summary_employee: 'Çalışan',
    confirm_summary_time: 'Saat',
    confirm_summary_question: 'Onaylıyor musunuz?',
    queue_confirm_body: 'Sıraya ekleniyorsunuz. Onaylıyor musunuz?',
    queue_btn_confirm: 'Onayla',
    queue_btn_cancel: 'İptal',
    cancelled_message: 'İşlem iptal edildi. Tekrar yazarsanız menü açılır.',
    appointment_approved: 'Randevunuz onaylandı.',
    appointment_pending: 'Talebiniz onaya gönderildi. Onaylandığında size bildirilecektir.',
    queue_result_prefix: 'Sıraya eklendiniz.',
    queue_result_position: 'Sıra numaranız:',
    queue_result_suffix: "Sıradan çıkmak için 'İptal' yazabilirsiniz.",
    slot_unavailable: 'Bu slot artık müsait değil. Lütfen başka bir saat seçin.',
    existing_same_day: 'Bu gün için zaten bir randevunuz var (web veya WhatsApp). Başka bir gün seçebilirsiniz.',
    appointment_approved_notify: 'Randevunuz onaylandı.',
    appointment_rejected_notify: 'Talebiniz reddedildi. İsterseniz yeniden randevu alabilirsiniz.',
    date_today: 'Bugün',
    date_tomorrow: 'Yarın',
    date_days_later: (n) => `${n} gün sonra`,
  },
  en: {
    welcome_body: 'What would you like to do?',
    welcome_btn_appointment: 'Book appointment',
    welcome_btn_queue: 'Join queue',
    welcome_btn_cancel: 'Cancel',
    date_select_body: 'Which day?',
    date_select_button: 'Select date',
    date_section_title: 'Date',
    employee_select_body: 'Which staff?',
    employee_select_button: 'Select staff',
    employees_section_title: 'Staff',
    time_select_body: 'Which time?',
    time_select_button: 'Select time',
    time_section_title: 'Available times',
    time_select_no_slots: 'No available times for this day. Please choose another day or staff member.',
    confirm_btn_confirm: 'Confirm',
    confirm_btn_back: 'Back',
    confirm_btn_cancel: 'Cancel',
    confirm_summary_prefix: 'Appointment summary:',
    confirm_summary_day: 'Day',
    confirm_summary_employee: 'Staff',
    confirm_summary_time: 'Time',
    confirm_summary_question: 'Do you confirm?',
    queue_confirm_body: 'You are joining the queue. Do you confirm?',
    queue_btn_confirm: 'Confirm',
    queue_btn_cancel: 'Cancel',
    cancelled_message: 'Cancelled. Send a message to see the menu again.',
    appointment_approved: 'Your appointment has been confirmed.',
    appointment_pending: 'Your request has been submitted. You will be notified when it is confirmed.',
    queue_result_prefix: 'You have been added to the queue.',
    queue_result_position: 'Your queue number:',
    queue_result_suffix: "To leave the queue, type 'Cancel'.",
    slot_unavailable: 'This slot is no longer available. Please choose another time.',
    existing_same_day: 'You already have an appointment on this day (web or WhatsApp). Please choose another day.',
    appointment_approved_notify: 'Your appointment has been confirmed.',
    appointment_rejected_notify: 'Your request was declined. You can book again if you wish.',
    date_today: 'Today',
    date_tomorrow: 'Tomorrow',
    date_days_later: (n) => `${n} days from now`,
  },
};

const FALLBACK_LANG = 'tr';

/**
 * @param {string} lang - 'tr' | 'en'
 * @returns {(key: string, ...args: unknown[]) => string}
 */
function getWaT(lang) {
  const L = messages[lang] || messages[FALLBACK_LANG];
  return function (key, ...args) {
    const val = L[key] ?? messages[FALLBACK_LANG][key];
    if (typeof val === 'function') return val(...args);
    return typeof val === 'string' ? val : key;
  };
}

/** Panel için kullanılabilir WhatsApp dilleri */
const AVAILABLE_LANGUAGES = [
  { code: 'tr', name: 'Türkçe' },
  { code: 'en', name: 'English' },
];

function getAvailableLanguages() {
  return AVAILABLE_LANGUAGES;
}

module.exports = {
  messages,
  getWaT,
  getAvailableLanguages,
  FALLBACK_LANG,
};
