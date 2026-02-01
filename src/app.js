require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { sequelize } = require('./models');
const config = require('./config');
const errorHandler = require('./middlewares/errorHandler');

const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const businessRoutes = require('./routes/business');
const employeeRoutes = require('./routes/employees');
const appointmentRoutes = require('./routes/appointments');
const queueRoutes = require('./routes/queue');
const contactRoutes = require('./routes/contacts');
const billingRoutes = require('./routes/billing');
const integrationRoutes = require('./routes/integrations');
const whatsappWebhookRoutes = require('./routes/whatsappWebhook');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(config.cookie.secret));

app.use('/public', publicRoutes);
app.use('/auth', authRoutes);
app.use('/business', businessRoutes);
app.use('/employees', employeeRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/queue', queueRoutes);
app.use('/contacts', contactRoutes);
app.use('/billing', billingRoutes);
app.use('/integrations', integrationRoutes);
app.use('/admin', adminRoutes);
app.use('/webhooks/whatsapp', whatsappWebhookRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: config.env });
});

app.use(errorHandler);

async function ensureQueueEntryColumns() {
  const [results] = await sequelize.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'queue_entries' AND table_schema = 'public'
  `);
  const columns = (results || []).map((r) => r.column_name);
  if (columns.includes('queue_date') && columns.includes('position')) return;

  if (!columns.includes('queue_date')) {
    await sequelize.query('ALTER TABLE queue_entries ADD COLUMN queue_date DATE');
    await sequelize.query("UPDATE queue_entries SET queue_date = CURRENT_DATE WHERE queue_date IS NULL");
    await sequelize.query('ALTER TABLE queue_entries ALTER COLUMN queue_date SET NOT NULL');
  }
  if (!columns.includes('position')) {
    await sequelize.query('ALTER TABLE queue_entries ADD COLUMN position INTEGER');
    await sequelize.query('UPDATE queue_entries SET position = 0 WHERE position IS NULL');
  }
  if (!columns.includes('source_channel')) {
    await sequelize.query('ALTER TABLE queue_entries ADD COLUMN source_channel VARCHAR(32)');
  }
}

async function ensureBusinessPhoneColumn() {
  const [results] = await sequelize.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'businesses' AND table_schema = 'public'
  `);
  const columns = (results || []).map((r) => r.column_name);
  if (columns.includes('phone_e164')) return;

  await sequelize.query('ALTER TABLE businesses ADD COLUMN phone_e164 VARCHAR(32)');
  await sequelize.query("UPDATE businesses SET phone_e164 = '+900000000000' WHERE phone_e164 IS NULL");
  await sequelize.query('ALTER TABLE businesses ALTER COLUMN phone_e164 SET NOT NULL');
}

async function start() {
  try {
    await sequelize.authenticate();
    const alter = config.env !== 'production' && config.database.alter;
    await sequelize.sync({ alter });
    await ensureQueueEntryColumns();
    await ensureBusinessPhoneColumn();
    await seedPlansIfNeeded();
    await seedSuperAdminIfNeeded();
    await ensureUsersFromBusinesses();
    const port = config.port;
    app.listen(port, () => {
      console.log(`Server listening on port ${port} (${config.env})`);
    });
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}

async function seedPlansIfNeeded() {
  const { Plan } = require('./models');
  const count = await Plan.count();
  if (count > 0) return;
  await Plan.bulkCreate([
    { code: 'core', name: 'Core', includes_whatsapp: false, price_json: { amount: 99, currency: 'TRY', interval: 'month' }, is_active: true },
    { code: 'core_whatsapp', name: 'Core + WhatsApp', includes_whatsapp: true, price_json: { amount: 149, currency: 'TRY', interval: 'month' }, is_active: true },
  ]);
  console.log('Plans seeded.');
}

async function seedSuperAdminIfNeeded() {
  const { User } = require('./models');
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !password) return;
  const existing = await User.findOne({ where: { email: email.trim().toLowerCase() } });
  if (existing) return;
  const { hashPassword } = require('./utils/hash');
  await User.create({
    email: email.trim().toLowerCase(),
    password_hash: await hashPassword(password),
    role: 'super_admin',
    business_id: null,
  });
  console.log('Super-admin user created.');
}

async function ensureUsersFromBusinesses() {
  const { User, Business } = require('./models');
  const businesses = await Business.findAll({ attributes: ['id', 'email', 'password_hash'] });
  for (const b of businesses) {
    const exists = await User.findOne({ where: { email: b.email } });
    if (exists) continue;
    await User.create({
      email: b.email,
      password_hash: b.password_hash,
      role: 'business',
      business_id: b.id,
    });
  }
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

module.exports = app;
