const jwt = require('jsonwebtoken');
const config = require('../config');
const { Business } = require('../models');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ code: 'unauthorized', message: 'Token gerekli' });
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    if (!payload.businessId) {
      return res.status(401).json({ code: 'unauthorized', message: 'Geçersiz token' });
    }
    req.businessId = payload.businessId;
    req.jwtPayload = payload;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 'token_expired', message: 'Token süresi doldu' });
    }
    return res.status(401).json({ code: 'unauthorized', message: 'Geçersiz token' });
  }
}

async function attachBusiness(req, res, next) {
  if (!req.businessId) return next();
  try {
    const business = await Business.findByPk(req.businessId);
    if (!business) {
      return res.status(404).json({ code: 'business_not_found', message: 'İşletme bulunamadı' });
    }
    req.business = business;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  authMiddleware,
  attachBusiness,
};
