const { Appointment, Employee, Customer, WaUser } = require('../models');
const subscriptionService = require('../services/subscriptionService');
const appointmentService = require('../services/appointmentService');
const { Op } = require('sequelize');

async function list(req, res, next) {
  try {
    await subscriptionService.requireCoreSubscription(req.businessId);
    const date = req.query.date;
    if (!date) {
      return res.status(400).json({ code: 'validation_error', message: 'date (YYYY-MM-DD) gerekli' });
    }
    const start = new Date(date + 'T00:00:00');
    const end = new Date(date + 'T23:59:59');
    const list = await Appointment.findAll({
      where: {
        business_id: req.businessId,
        starts_at: { [Op.gte]: start, [Op.lte]: end },
      },
      include: [
        { model: Employee, attributes: ['id', 'name', 'surname'] },
        { model: Customer, attributes: ['id', 'name', 'surname', 'phone_e164'], required: false },
        { model: WaUser, attributes: ['id', 'display_name', 'wa_id'], required: false },
      ],
      order: [['starts_at', 'ASC']],
    });
    res.json({ appointments: list });
  } catch (err) {
    next(err);
  }
}

async function listRequests(req, res, next) {
  try {
    await subscriptionService.requireCoreSubscription(req.businessId);
    const date = req.query.date;
    const where = { business_id: req.businessId, approval_status: 'pending' };
    if (date) {
      const start = new Date(date + 'T00:00:00');
      const end = new Date(date + 'T23:59:59');
      where.starts_at = { [Op.gte]: start, [Op.lte]: end };
    }
    const list = await Appointment.findAll({
      where,
      include: [
        { model: Employee, attributes: ['id', 'name', 'surname'] },
        { model: Customer, attributes: ['id', 'name', 'surname', 'phone_e164'], required: false },
        { model: WaUser, attributes: ['id', 'display_name'], required: false },
      ],
      order: [['requested_at', 'ASC']],
    });
    res.json({ appointments: list });
  } catch (err) {
    next(err);
  }
}

async function patchStatus(req, res, next) {
  try {
    await subscriptionService.requireCoreSubscription(req.businessId);
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, business_id: req.businessId },
    });
    if (!appointment) {
      return res.status(404).json({ code: 'not_found', message: 'Randevu bulunamadı' });
    }
    const { status } = req.body;
    const allowed = ['scheduled', 'completed', 'cancelled', 'no_show'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ code: 'validation_error', message: 'Geçerli status gerekli' });
    }
    await appointment.update({ status });
    res.json(appointment);
  } catch (err) {
    next(err);
  }
}

async function approve(req, res, next) {
  try {
    const appointment = await appointmentService.approveAppointment(req.businessId, req.params.id);
    res.json(appointment);
  } catch (err) {
    next(err);
  }
}

async function reject(req, res, next) {
  try {
    const appointment = await appointmentService.rejectAppointment(req.businessId, req.params.id);
    res.json(appointment);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, listRequests, patchStatus, approve, reject };
