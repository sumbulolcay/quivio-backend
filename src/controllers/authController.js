const jwt = require('jsonwebtoken');
const config = require('../config');
const { User, Business, Plan, Subscription } = require('../models');
const Sequelize = require('sequelize');
const { hashPassword, comparePassword } = require('../utils/hash');
const Op = Sequelize.Op;

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ code: 'validation_error', message: 'email ve password gerekli' });
    }
    const user = await User.findOne({
      where: { email: email.trim().toLowerCase() },
      include: [{ model: Business, as: 'Business', attributes: ['id', 'slug', 'name'], required: false }],
    });
    if (!user) {
      return res.status(401).json({ code: 'invalid_credentials', message: 'E-posta veya şifre hatalı' });
    }
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ code: 'invalid_credentials', message: 'E-posta veya şifre hatalı' });
    }
    const payload = {
      userId: user.id,
      role: user.role,
      ...(user.role === 'business' && user.business_id && { businessId: user.business_id }),
    };
    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
    const response = { token, user: { id: user.id, email: user.email, role: user.role } };
    if (user.role === 'business' && user.Business) {
      response.business = { id: user.Business.id, slug: user.Business.slug, name: user.Business.name };
    }
    res.json(response);
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const { email, password, name, slug, phone_e164: phoneRaw } = req.body;
    if (!email || !password || !name || !slug || !phoneRaw) {
      return res.status(400).json({ code: 'validation_error', message: 'email, password, name, slug, phone_e164 zorunlu' });
    }
    const { normalizeE164, isValidE164 } = require('../utils/phone');
    const phone_e164 = normalizeE164(phoneRaw);
    if (!phone_e164 || !isValidE164(phone_e164)) {
      return res.status(400).json({ code: 'validation_error', message: 'Geçerli bir Türkiye telefon numarası girin (+90...)' });
    }
    const normalizedSlug = String(slug).trim().toLowerCase().replace(/\s+/g, '-');
    const existingUser = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    if (existingUser) {
      return res.status(409).json({ code: 'conflict', message: 'Bu e-posta zaten kullanılıyor' });
    }
    const existingBusiness = await Business.findOne({ where: { slug: normalizedSlug } });
    if (existingBusiness) {
      return res.status(409).json({ code: 'conflict', message: 'Bu slug zaten kullanılıyor' });
    }
    const password_hash = await hashPassword(password);
    const business = await Business.create({
      email: email.trim().toLowerCase(),
      password_hash,
      name: name.trim(),
      slug: normalizedSlug,
      phone_e164,
    });
    const user = await User.create({
      email: email.trim().toLowerCase(),
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
    const payload = { userId: user.id, role: 'business', businessId: business.id };
    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
    res.status(201).json({
      token,
      user: { id: payload.userId, email: business.email, role: 'business' },
      business: { id: business.id, slug: business.slug, name: business.name },
    });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({
        code: 'validation_error',
        message: 'Mevcut şifre ve yeni şifre zorunludur',
      });
    }
    if (String(new_password).length < 6) {
      return res.status(400).json({
        code: 'validation_error',
        message: 'Yeni şifre en az 6 karakter olmalıdır',
      });
    }
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(401).json({ code: 'unauthorized', message: 'Kullanıcı bulunamadı' });
    }
    const valid = await comparePassword(current_password, user.password_hash);
    if (!valid) {
      return res.status(400).json({
        code: 'invalid_current_password',
        message: 'Mevcut şifre hatalı',
      });
    }
    const password_hash = await hashPassword(new_password);
    await user.update({ password_hash });
    if (req.role === 'business' && req.businessId) {
      const business = await Business.findByPk(req.businessId);
      if (business) await business.update({ password_hash });
    }
    res.json({ message: 'Şifre güncellendi' });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, register, changePassword };
