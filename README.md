# Qivio Backend

Multi-tenant randevu ve sıra sistemi backend (Node.js + Express + Sequelize + PostgreSQL).

## Özellikler

- **Multi-tenant**: İşletme (Business) bazlı
- **Public booking**: QR/Link üzerinden randevu + sıra (OTP, reCAPTCHA v3)
- **Backoffice**: JWT ile işletme paneli (çalışan, randevu, sıra, rehber, abonelik, entegrasyonlar)
- **WhatsApp**: Interaktif randevu/sıra akışı (state machine)
- **Abonelik**: Trial + plan (core, core_whatsapp), PayTR/iyzico (provider-agnostic)
- **SMS/OTP**: Twilio (provider-agnostic)

## Gereksinimler

- Node.js >= 18
- PostgreSQL

## Kurulum

```bash
cp .env.example .env
# .env içinde DATABASE_URL, JWT_SECRET, COOKIE_SECRET vb. düzenleyin
npm install
npm run dev
```

## Ortam Değişkenleri

- `DATABASE_URL` – PostgreSQL bağlantı URL’i
- `JWT_SECRET` – Backoffice JWT imzası
- `COOKIE_SECRET` – Müşteri oturum çerez imzası
- `PUBLIC_BASE_URL` – Frontend / callback temel URL
- `RECAPTCHA_SECRET_KEY`, `RECAPTCHA_MIN_SCORE` – reCAPTCHA v3
- `PAYMENT_PROVIDER` (paytr | iyzico), `PAYTR_*`, `IYZICO_*`
- `SMS_PROVIDER` (twilio), `TWILIO_*`
- `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`
- `NODE_ENV`, `PORT`, `SEQUELIZE_ALTER` (dev’de alter: true için)
- `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` – İlk açılışta super-admin kullanıcı oluşturulur (opsiyonel)

## Kullanıcı ve roller

- **User** tablosu: `email`, `password_hash`, `role` (business | super_admin), `business_id` (business rolü için zorunlu).
- **business**: Sadece kendi işletmesine (`business_id`) yetkili. JWT’de `businessId` otomatik gelir.
- **super_admin**: Tüm işletmeler üzerinde yetkili. İşletme kapsamı gerektiren isteklerde **X-Business-Id** header veya **businessId** query parametresi zorunlu. Önce `GET /admin/businesses` ile işletme listesini alıp bir `businessId` seçer.
- Login yanıtı: `token`, `user: { id, email, role }`, rol business ise ek olarak `business: { id, slug, name }`.

## API Özeti

### Public (QR/Link)

- `GET /public/business/:slug` – İşletme bilgisi
- `GET /public/employees?slug=...` – Aktif çalışanlar
- `GET /public/availability?slug=...&date=YYYY-MM-DD&employeeId=...` – Müsaitlik
- `POST /public/otp/start` – OTP başlat (recaptchaToken zorunlu)
- `POST /public/otp/verify` – OTP doğrula
- `POST /public/appointments` – Randevu oluştur (recaptchaToken, cookie oturum)
- `POST /public/queue` – Sıraya gir

### Auth

- `POST /auth/login` – İşletme girişi
- `POST /auth/register` – İşletme kaydı (recaptchaToken zorunlu)

### Backoffice (Authorization: Bearer &lt;token&gt;)

- **İşletme rolü:** Token’daki `businessId` kullanılır.
- **Super-admin:** Her istekte `X-Business-Id` header veya `?businessId=` zorunlu (işletme kapsamı gereken endpoint’lerde).

- `GET/PUT /business/settings`, `GET/PUT /business/booking-settings`
- `GET/POST/PATCH /employees`
- `GET /appointments?date=`, `GET /appointments/requests?date=`, `PATCH /appointments/:id/status`, `PATCH /appointments/:id/approve`, `PATCH /appointments/:id/reject`
- `GET /queue?date=`, `PATCH /queue/:id/status`
- `GET/POST/PATCH /contacts`
- `GET /billing/subscription`, `POST /billing/start-trial`, `POST /billing/checkout`
- `GET /integrations/whatsapp`, `POST /integrations/whatsapp/connect`, `POST /integrations/whatsapp/disconnect`

### Admin (sadece super_admin)

- `GET /admin/businesses` – Tüm işletmeleri listele (X-Business-Id seçmek için)

### Webhooks

- `GET/POST /webhooks/whatsapp` – WhatsApp doğrulama ve mesaj webhook’u
- `POST /billing/webhook/paytr`, `POST /billing/webhook/iyzico` – Ödeme callback’leri

## Postman

`postman/` klasöründeki collection ve environment dosyalarını içe aktarın. Ortam değişkenleri: `baseUrl`, `authToken`, `businessSlug`, `employeeId`.

## Veritabanı

Sequelize sync kullanılır (migration yok). Production’da `SEQUELIZE_ALTER=false`, dev’de isteğe bağlı `SEQUELIZE_ALTER=true`. `force` kullanılmaz.
