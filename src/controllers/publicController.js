const { Business, Employee, BusinessSettings } = require('../models');
const subscriptionService = require('../services/subscriptionService');
const otpService = require('../services/otpService');
const availabilityService = require('../services/availabilityService');
const appointmentService = require('../services/appointmentService');
const { getCustomerSession, setCustomerSession } = require('../utils/cookie');
const config = require('../config');
const { normalizeE164, isValidE164 } = require('../utils/phone');
const crypto = require('crypto');

async function getBusinessBySlug(req, res, next) {
  try {
    const business = await Business.findOne({
      where: { slug: req.params.slug },
      include: [BusinessSettings],
    });
    const { sendError } = require('../utils/response');
    if (!business) {
      return sendError(req, res, 404, 'not_found', 'İşletme bulunamadı');
    }
    await subscriptionService.requireCoreSubscription(business.id);
    const settings = business.BusinessSetting || {};
    res.json({
      id: business.id,
      slug: business.slug,
      name: business.name,
      employee_selection_label: settings.employee_selection_label || null,
      logo_url: settings.logo_url || null,
    });
  } catch (err) {
    next(err);
  }
}

async function getEmployees(req, res, next) {
  try {
    const slug = req.query.slug;
    const { sendError } = require('../utils/response');
    if (!slug) {
      return sendError(req, res, 400, 'validation_error', 'slug gerekli');
    }
    const business = await Business.findOne({ where: { slug } });
    if (!business) {
      return sendError(req, res, 404, 'not_found', 'İşletme bulunamadı');
    }
    await subscriptionService.requireCoreSubscription(business.id);
    const list = await Employee.findAll({
      where: { business_id: business.id, is_active: true },
      attributes: ['id', 'name', 'surname', 'role'],
    });
    res.json({ employees: list });
  } catch (err) {
    next(err);
  }
}

async function getAvailability(req, res, next) {
  try {
    const { slug, date, employeeId } = req.query;
    const { sendError } = require('../utils/response');
    if (!slug || !date || !employeeId) {
      return sendError(req, res, 400, 'validation_error', 'slug, date ve employeeId gerekli');
    }
    const business = await Business.findOne({ where: { slug } });
    if (!business) {
      return sendError(req, res, 404, 'not_found', 'İşletme bulunamadı');
    }
    await subscriptionService.requireCoreSubscription(business.id);
    const slots = await availabilityService.getSlotsForEmployee(business.id, parseInt(employeeId, 10), date);
    res.json({ slots });
  } catch (err) {
    next(err);
  }
}

async function otpStart(req, res, next) {
  try {
    const { slug, phone_e164: rawPhone } = req.body;
    const phoneE164 = normalizeE164(rawPhone) || rawPhone;
    const { sendError } = require('../utils/response');
    if (!slug || !isValidE164(phoneE164)) {
      return sendError(req, res, 400, 'validation_error', 'slug ve geçerli telefon gerekli');
    }
    const business = await Business.findOne({ where: { slug } });
    if (!business) {
      return sendError(req, res, 404, 'not_found', 'İşletme bulunamadı');
    }
    await subscriptionService.requireCoreSubscription(business.id);
    const result = await otpService.startOtp(business.id, phoneE164);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function otpVerify(req, res, next) {
  try {
    const { slug, phone_e164: rawPhone, code } = req.body;
    const phoneE164 = normalizeE164(rawPhone) || rawPhone;
    const { sendError } = require('../utils/response');
    if (!slug || !isValidE164(phoneE164) || !code || String(code).length !== 6) {
      return sendError(req, res, 400, 'validation_error', 'slug, telefon ve 6 haneli kod gerekli');
    }
    const business = await Business.findOne({ where: { slug } });
    if (!business) {
      return sendError(req, res, 404, 'not_found', 'İşletme bulunamadı');
    }
    const { customer } = await otpService.verifyOtp(business.id, phoneE164, String(code));
    const exp = Math.floor(Date.now() / 1000) + config.cookie.maxAgeDays * 86400;
    const phoneHash = crypto.createHash('sha256').update(phoneE164 + config.cookie.secret).digest('hex').slice(0, 16);
    setCustomerSession(res, {
      businessId: business.id,
      customerId: customer.id,
      phoneHash,
      verifiedAt: new Date().toISOString(),
      exp,
    });
    res.json({
      customerId: customer.id,
      name: customer.name,
      surname: customer.surname,
    });
  } catch (err) {
    next(err);
  }
}

async function createAppointment(req, res, next) {
  try {
    const { slug, employee_id, starts_at, name, surname } = req.body;
    const { sendError } = require('../utils/response');
    if (!slug || !employee_id || !starts_at || !name || !surname) {
      return sendError(req, res, 400, 'validation_error', 'slug, employee_id, starts_at, name, surname zorunlu');
    }
    const session = getCustomerSession(req);
    if (!session || session.businessId === undefined) {
      return sendError(req, res, 401, 'session_required', 'Önce OTP ile giriş yapın');
    }
    const business = await Business.findOne({ where: { slug } });
    if (!business || business.id !== session.businessId) {
      return sendError(req, res, 403, 'forbidden', 'Oturum bu işletme ile eşleşmiyor');
    }
    let customerId = session.customerId;
    if (!customerId) {
      return sendError(req, res, 401, 'session_required', 'Müşteri oturumu gerekli');
    }
    const customer = await require('../models').Customer.findByPk(customerId);
    if (customer) {
      await customer.update({ name, surname });
    }
    const appointment = await appointmentService.createPublicAppointment(business.id, {
      employee_id,
      customer_id: customerId,
      starts_at,
      name,
      surname,
    });
    await appointmentService.upsertContactFromCustomer(business.id, { ...customer?.toJSON(), name, surname });
    res.status(201).json({
      id: appointment.id,
      starts_at: appointment.starts_at,
      approval_status: appointment.approval_status,
    });
  } catch (err) {
    next(err);
  }
}

async function updateMyAppointment(req, res, next) {
  try {
    const { slug, employee_id, starts_at, name, surname } = req.body;
    const appointmentId = req.params.id;
    const { sendError } = require('../utils/response');
    if (!slug || !employee_id || !starts_at) {
      return sendError(req, res, 400, 'validation_error', 'slug, employee_id ve starts_at zorunlu');
    }
    const session = getCustomerSession(req);
    if (!session || !session.customerId) {
      return sendError(req, res, 401, 'session_required', 'Önce OTP ile giriş yapın');
    }
    const business = await Business.findOne({ where: { slug } });
    if (!business || business.id !== session.businessId) {
      return sendError(req, res, 403, 'forbidden', 'Oturum bu işletme ile eşleşmiyor');
    }
    const models = require('../models');
    const customer = await models.Customer.findByPk(session.customerId);
    if (customer && (name || surname)) {
      await customer.update({
        name: name !== undefined ? name : customer.name,
        surname: surname !== undefined ? surname : customer.surname,
      });
    }
    const appointment = await appointmentService.reschedulePublicAppointment(
      business.id,
      appointmentId,
      session.customerId,
      {
        employee_id,
        starts_at,
        name,
        surname,
      },
    );
    await appointmentService.upsertContactFromCustomer(business.id, { ...customer?.toJSON(), name, surname });
    res.json({
      id: appointment.id,
      starts_at: appointment.starts_at,
      approval_status: appointment.approval_status,
    });
  } catch (err) {
    next(err);
  }
}

async function cancelMyAppointment(req, res, next) {
  try {
    const { slug } = req.body;
    const appointmentId = req.params.id;
    const { sendError } = require('../utils/response');
    if (!slug) {
      return sendError(req, res, 400, 'validation_error', 'slug zorunlu');
    }
    const session = getCustomerSession(req);
    if (!session || !session.customerId) {
      return sendError(req, res, 401, 'session_required', 'Önce OTP ile giriş yapın');
    }
    const business = await Business.findOne({ where: { slug } });
    if (!business || business.id !== session.businessId) {
      return sendError(req, res, 403, 'forbidden', 'Oturum bu işletme ile eşleşmiyor');
    }
    const appointment = await appointmentService.cancelPublicAppointment(
      business.id,
      appointmentId,
      session.customerId,
    );
    res.json({
      id: appointment.id,
      starts_at: appointment.starts_at,
      status: appointment.status,
    });
  } catch (err) {
    next(err);
  }
}

async function getMyUpcomingAppointments(req, res, next) {
  try {
    const { slug } = req.query;
    const { sendError } = require('../utils/response');
    if (!slug) {
      return sendError(req, res, 400, 'validation_error', 'slug gerekli');
    }
    const session = getCustomerSession(req);
    if (!session || !session.customerId) {
      return sendError(req, res, 401, 'session_required', 'Önce OTP ile giriş yapın');
    }
    const business = await Business.findOne({ where: { slug } });
    if (!business || business.id !== session.businessId) {
      return sendError(req, res, 403, 'forbidden', 'Oturum bu işletme ile eşleşmiyor');
    }
    const { Appointment, Employee } = require('../models');
    const Sequelize = require('sequelize');
    const Op = Sequelize.Op;
    const now = new Date();
    const list = await Appointment.findAll({
      where: {
        business_id: business.id,
        customer_id: session.customerId,
        status: { [Op.ne]: 'cancelled' },
        starts_at: { [Op.gt]: now },
      },
      include: [
        { model: Employee, attributes: ['id', 'name', 'surname', 'role'] },
      ],
      order: [['starts_at', 'ASC']],
    });
    res.json({ appointments: list });
  } catch (err) {
    next(err);
  }
}

function getTodayDateStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function createQueueEntry(req, res, next) {
  try {
    const { slug, employee_id: employeeId } = req.body;
    const { sendError } = require('../utils/response');
    if (!slug) {
      return sendError(req, res, 400, 'validation_error', 'slug zorunlu');
    }
    const session = getCustomerSession(req);
    if (!session || !session.customerId) {
      return sendError(
        req,
        res,
        401,
        'session_required',
        'Sıra almak için telefon numarası doğrulaması gerekli. Önce OTP ile giriş yapın.',
      );
    }
    const business = await Business.findOne({ where: { slug } });
    if (!business || business.id !== session.businessId) {
      return sendError(req, res, 403, 'forbidden', 'Oturum bu işletme ile eşleşmiyor');
    }
    await subscriptionService.requireCoreSubscription(business.id);
    const Sequelize = require('sequelize');
    const Op = Sequelize.Op;
    const { QueueEntry } = require('../models');
    const todayStr = getTodayDateStr();
    const existingToday = await QueueEntry.findOne({
      where: {
        business_id: business.id,
        customer_id: session.customerId,
        queue_date: todayStr,
      },
    });
    if (existingToday) {
      return res.status(400).json({
        code: 'one_queue_per_day',
        message: require('../i18n').translate(req.lang || 'tr', 'one_queue_per_day', 'Bugün için zaten bir sıra numaranız var.'),
        queue_number: existingToday.position,
        existing: {
          id: existingToday.id,
          position: existingToday.position,
          status: existingToday.status,
          queue_date: existingToday.queue_date,
        },
      });
    }
    const maxPos = await QueueEntry.max('position', {
      where: { business_id: business.id, queue_date: todayStr },
    });
    const position = (maxPos == null ? -1 : maxPos) + 1;
    const entry = await QueueEntry.create({
      business_id: business.id,
      employee_id: employeeId || null,
      customer_id: session.customerId,
      wa_user_id: null,
      status: 'waiting',
      queue_date: todayStr,
      position,
      source_channel: 'web',
    });
    res.status(201).json({ id: entry.id, position, status: entry.status });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBusinessBySlug,
  getEmployees,
  getAvailability,
  otpStart,
  otpVerify,
  createAppointment,
  updateMyAppointment,
  getMyUpcomingAppointments,
  cancelMyAppointment,
  createQueueEntry,
};
