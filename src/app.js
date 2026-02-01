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
app.use('/webhooks/whatsapp', whatsappWebhookRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: config.env });
});

app.use(errorHandler);

async function start() {
  try {
    await sequelize.authenticate();
    const alter = config.env !== 'production' && config.database.alter;
    await sequelize.sync({ alter });
    await seedPlansIfNeeded();
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

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

module.exports = app;
