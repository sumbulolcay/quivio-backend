const { Business, User, Plan, Subscription } = require('../models');
const { hashPassword } = require('../utils/hash');
const { normalizeE164, isValidE164 } = require('../utils/phone');
const { Op } = require('sequelize');

async function listBusinesses(req, res, next) {
  try {
    const list = await Business.findAll({
      attributes: ['id', 'slug', 'name', 'email', 'phone_e164', 'created_at'],
      order: [['id', 'ASC']],
    });
    res.json({ businesses: list });
  } catch (err) {
    next(err);
  }
}

async function createBusiness(req, res, next) {
  try {
    const { email, password, name, slug, phone_e164: phoneRaw } = req.body;
    if (!email || !password || !name || !slug || !phoneRaw) {
      return res.status(400).json({
        code: 'validation_error',
        message: 'email, password, name, slug, phone_e164 zorunludur',
      });
    }
    const phone_e164 = normalizeE164(phoneRaw);
    if (!phone_e164 || !isValidE164(phone_e164)) {
      return res.status(400).json({
        code: 'validation_error',
        message: 'Geçerli bir Türkiye telefon numarası girin (+90...)',
      });
    }
    const normalizedSlug = String(slug).trim().toLowerCase().replace(/\s+/g, '-');
    const emailNorm = email.trim().toLowerCase();
    const existingUser = await User.findOne({ where: { email: emailNorm } });
    if (existingUser) {
      return res.status(409).json({ code: 'conflict', message: 'Bu e-posta zaten kullanılıyor' });
    }
    const existingBusiness = await Business.findOne({ where: { slug: normalizedSlug } });
    if (existingBusiness) {
      return res.status(409).json({ code: 'conflict', message: 'Bu slug zaten kullanılıyor' });
    }
    const password_hash = await hashPassword(password);
    const business = await Business.create({
      email: emailNorm,
      password_hash,
      name: name.trim(),
      slug: normalizedSlug,
      phone_e164,
    });
    await User.create({
      email: emailNorm,
      password_hash,
      role: 'business',
      business_id: business.id,
    });
    const defaultPlan = await Plan.findOne({ where: { code: 'core', is_active: true } });
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);
    await Subscription.create({
      business_id: business.id,
      plan_code: defaultPlan ? defaultPlan.code : 'core',
      status: 'trial_active',
      trial_ends_at: trialEndsAt,
    });
    res.status(201).json({
      business: { id: business.id, slug: business.slug, name: business.name, email: business.email, phone_e164: business.phone_e164, created_at: business.created_at },
    });
  } catch (err) {
    next(err);
  }
}

async function updateBusiness(req, res, next) {
  try {
    const business = await Business.findByPk(req.params.id);
    if (!business) {
      return res.status(404).json({ code: 'not_found', message: 'İşletme bulunamadı' });
    }
    const { name, email, slug, password, phone_e164: phoneRaw } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (phoneRaw !== undefined) {
      const phone_e164 = normalizeE164(phoneRaw);
      if (!phone_e164 || !isValidE164(phone_e164)) {
        return res.status(400).json({
          code: 'validation_error',
          message: 'Geçerli bir Türkiye telefon numarası girin (+90...)',
        });
      }
      updates.phone_e164 = phone_e164;
    }
    if (email !== undefined) {
      const emailNorm = email.trim().toLowerCase();
      const existingUser = await User.findOne({ where: { email: emailNorm } });
      if (existingUser && existingUser.business_id !== business.id) {
        return res.status(409).json({ code: 'conflict', message: 'Bu e-posta zaten kullanılıyor' });
      }
      updates.email = emailNorm;
    }
    if (slug !== undefined) {
      const normalizedSlug = String(slug).trim().toLowerCase().replace(/\s+/g, '-');
      const existingBiz = await Business.findOne({ where: { slug: normalizedSlug, id: { [Op.ne]: business.id } } });
      if (existingBiz) {
        return res.status(409).json({ code: 'conflict', message: 'Bu slug zaten kullanılıyor' });
      }
      updates.slug = normalizedSlug;
    }
    if (Object.keys(updates).length > 0) await business.update(updates);
    if (password !== undefined && String(password).length > 0) {
      const password_hash = await hashPassword(password);
      await business.update({ password_hash });
      const user = await User.findOne({ where: { business_id: business.id } });
      if (user) await user.update({ password_hash });
    }
    const user = await User.findOne({ where: { business_id: business.id } });
    if (user && updates.email) await user.update({ email: updates.email });
    const updated = await Business.findByPk(business.id, { attributes: ['id', 'slug', 'name', 'email', 'phone_e164', 'created_at'] });
    res.json({ business: updated });
  } catch (err) {
    next(err);
  }
}

async function deleteBusiness(req, res, next) {
  try {
    const business = await Business.findByPk(req.params.id);
    if (!business) {
      return res.status(404).json({ code: 'not_found', message: 'İşletme bulunamadı' });
    }
    await business.destroy();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listBusinesses, createBusiness, updateBusiness, deleteBusiness };
