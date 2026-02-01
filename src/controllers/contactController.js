const { Contact, ContactTag, ContactTagMap } = require('../models');
const subscriptionService = require('../services/subscriptionService');

async function list(req, res, next) {
  try {
    await subscriptionService.requireCoreSubscription(req.businessId);
    const list = await Contact.findAll({
      where: { business_id: req.businessId },
      include: [{ model: ContactTag, as: 'ContactTags', through: { attributes: [] }, required: false }],
      order: [['full_name', 'ASC']],
    });
    res.json({ contacts: list });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    await subscriptionService.requireCoreSubscription(req.businessId);
    const { full_name, phone_e164, source_channel, notes } = req.body;
    if (!full_name || !phone_e164) {
      return res.status(400).json({ code: 'validation_error', message: 'full_name ve phone_e164 zorunlu' });
    }
    const [contact] = await Contact.findOrCreate({
      where: { business_id: req.businessId, phone_e164: phone_e164.trim() },
      defaults: {
        business_id: req.businessId,
        full_name: full_name.trim(),
        phone_e164: phone_e164.trim(),
        source_channel: source_channel || null,
        notes: notes || null,
      },
    });
    if (!contact.isNewRecord) {
      await contact.update({ full_name: full_name.trim(), notes: notes || contact.notes });
    }
    res.status(201).json(contact);
  } catch (err) {
    next(err);
  }
}

async function patch(req, res, next) {
  try {
    await subscriptionService.requireCoreSubscription(req.businessId);
    const contact = await Contact.findOne({
      where: { id: req.params.id, business_id: req.businessId },
    });
    if (!contact) {
      return res.status(404).json({ code: 'not_found', message: 'Kişi bulunamadı' });
    }
    const { full_name, phone_e164, notes, tag_ids } = req.body;
    if (full_name !== undefined) contact.full_name = full_name;
    if (phone_e164 !== undefined) contact.phone_e164 = phone_e164;
    if (notes !== undefined) contact.notes = notes;
    await contact.save();
    if (Array.isArray(tag_ids)) {
      await ContactTagMap.destroy({ where: { contact_id: contact.id } });
      for (const tagId of tag_ids) {
        await ContactTagMap.create({ contact_id: contact.id, tag_id: tagId });
      }
    }
    res.json(contact);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, patch };
