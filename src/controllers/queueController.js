const { QueueEntry, Employee, Customer, WaUser } = require('../models');
const subscriptionService = require('../services/subscriptionService');

async function list(req, res, next) {
  try {
    await subscriptionService.requireCoreSubscription(req.businessId);
    const date = req.query.date;
    if (!date) {
      return res.status(400).json({
        code: 'validation_error',
        message: 'date (YYYY-MM-DD) zorunludur. Sıra listesi günlük döner.',
      });
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date) || Number.isNaN(new Date(date + 'T12:00:00').getTime())) {
      return res.status(400).json({
        code: 'validation_error',
        message: 'date geçerli YYYY-MM-DD formatında olmalıdır.',
      });
    }
    const where = { business_id: req.businessId, queue_date: date };
    const list = await QueueEntry.findAll({
      where,
      include: [
        { model: Employee, attributes: ['id', 'name', 'surname'], required: false },
        { model: Customer, attributes: ['id', 'name', 'surname', 'phone_e164'], required: false },
        { model: WaUser, attributes: ['id', 'display_name'], required: false },
      ],
      order: [['position', 'ASC']],
    });
    res.json({ date, queue: list });
  } catch (err) {
    next(err);
  }
}

async function patchStatus(req, res, next) {
  try {
    await subscriptionService.requireCoreSubscription(req.businessId);
    const entry = await QueueEntry.findOne({
      where: { id: req.params.id, business_id: req.businessId },
    });
    if (!entry) {
      return res.status(404).json({ code: 'not_found', message: 'Sıra kaydı bulunamadı' });
    }
    const { status } = req.body;
    const allowed = ['waiting', 'called', 'served', 'cancelled'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ code: 'validation_error', message: 'Geçerli status gerekli' });
    }
    await entry.update({ status });
    res.json(entry);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, patchStatus };
