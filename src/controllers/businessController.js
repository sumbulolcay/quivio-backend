const { Business, BusinessSettings, BookingSettings } = require('../models');
const subscriptionService = require('../services/subscriptionService');

async function getSettings(req, res, next) {
  try {
    await subscriptionService.requireCoreSubscription(req.businessId);
    const business = await Business.findByPk(req.businessId, { include: [BusinessSettings] });
    if (!business) {
      return res.status(404).json({ code: 'not_found', message: 'İşletme bulunamadı' });
    }
    const settings = business.BusinessSetting || {};
    res.json({
      business: { id: business.id, slug: business.slug, name: business.name, email: business.email },
      working_hours: settings.working_hours,
      slot_duration: settings.slot_duration,
      max_parallel: settings.max_parallel,
    });
  } catch (err) {
    next(err);
  }
}

async function putSettings(req, res, next) {
  try {
    await subscriptionService.requireCoreSubscription(req.businessId);
    const { working_hours, slot_duration, max_parallel } = req.body;
    const [settings] = await BusinessSettings.findOrCreate({
      where: { business_id: req.businessId },
      defaults: { business_id: req.businessId },
    });
    if (working_hours !== undefined) settings.working_hours = working_hours;
    if (slot_duration !== undefined) settings.slot_duration = slot_duration;
    if (max_parallel !== undefined) settings.max_parallel = max_parallel;
    await settings.save();
    res.json({
      working_hours: settings.working_hours,
      slot_duration: settings.slot_duration,
      max_parallel: settings.max_parallel,
    });
  } catch (err) {
    next(err);
  }
}

async function getBookingSettings(req, res, next) {
  try {
    await subscriptionService.requireCoreSubscription(req.businessId);
    const settings = await BookingSettings.findOne({ where: { business_id: req.businessId } });
    res.json({
      auto_approve: settings ? settings.auto_approve : false,
      notify_email: settings ? settings.notify_email : null,
      notify_sms: settings ? settings.notify_sms : null,
    });
  } catch (err) {
    next(err);
  }
}

async function putBookingSettings(req, res, next) {
  try {
    await subscriptionService.requireCoreSubscription(req.businessId);
    const { auto_approve, notify_email, notify_sms } = req.body;
    const [settings] = await BookingSettings.findOrCreate({
      where: { business_id: req.businessId },
      defaults: { business_id: req.businessId },
    });
    if (typeof auto_approve === 'boolean') settings.auto_approve = auto_approve;
    if (notify_email !== undefined) settings.notify_email = notify_email;
    if (notify_sms !== undefined) settings.notify_sms = notify_sms;
    await settings.save();
    res.json({
      auto_approve: settings.auto_approve,
      notify_email: settings.notify_email,
      notify_sms: settings.notify_sms,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSettings,
  putSettings,
  getBookingSettings,
  putBookingSettings,
};
