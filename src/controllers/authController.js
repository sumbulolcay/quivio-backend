const jwt = require('jsonwebtoken');
const config = require('../config');
const { Business, Plan, Subscription } = require('../models');
const Sequelize = require('sequelize');
const { hashPassword, comparePassword } = require('../utils/hash');
const Op = Sequelize.Op;

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ code: 'validation_error', message: 'email ve password gerekli' });
    }
    const business = await Business.findOne({ where: { email: email.trim().toLowerCase() } });
    if (!business) {
      return res.status(401).json({ code: 'invalid_credentials', message: 'E-posta veya şifre hatalı' });
    }
    const valid = await comparePassword(password, business.password_hash);
    if (!valid) {
      return res.status(401).json({ code: 'invalid_credentials', message: 'E-posta veya şifre hatalı' });
    }
    const token = jwt.sign(
      { businessId: business.id },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    res.json({ token, business: { id: business.id, slug: business.slug, name: business.name } });
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const { email, password, name, slug } = req.body;
    if (!email || !password || !name || !slug) {
      return res.status(400).json({ code: 'validation_error', message: 'email, password, name, slug zorunlu' });
    }
    const normalizedSlug = String(slug).trim().toLowerCase().replace(/\s+/g, '-');
    const existing = await Business.findOne({
      where: {
        [Op.or]: [
          { email: email.trim().toLowerCase() },
          { slug: normalizedSlug },
        ],
      },
    });
    if (existing) {
      return res.status(409).json({ code: 'conflict', message: 'Bu e-posta veya slug zaten kullanılıyor' });
    }
    const password_hash = await hashPassword(password);
    const business = await Business.create({
      email: email.trim().toLowerCase(),
      password_hash,
      name: name.trim(),
      slug: normalizedSlug,
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
    const token = jwt.sign(
      { businessId: business.id },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    res.status(201).json({ token, business: { id: business.id, slug: business.slug, name: business.name } });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, register };
