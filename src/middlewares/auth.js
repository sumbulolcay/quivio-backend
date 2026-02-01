const jwt = require('jsonwebtoken');
const config = require('../config');
const { Business } = require('../models');

const X_BUSINESS_ID = 'x-business-id';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ code: 'unauthorized', message: 'Token gerekli' });
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.jwtPayload = payload;
    req.userId = payload.userId;
    req.role = payload.role;
    req.businessId = payload.businessId ?? null;

    if (req.role === 'super_admin') {
      const headerBusinessId = req.headers[X_BUSINESS_ID] || req.query.businessId;
      if (headerBusinessId) {
        req.businessId = parseInt(headerBusinessId, 10) || null;
      }
      return next();
    }

    if (req.role === 'business' && payload.businessId) {
      req.businessId = payload.businessId;
      return next();
    }

    if (payload.businessId) {
      req.role = 'business';
      req.businessId = payload.businessId;
      return next();
    }

    return res.status(401).json({ code: 'unauthorized', message: 'Geçersiz token' });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 'token_expired', message: 'Token süresi doldu' });
    }
    return res.status(401).json({ code: 'unauthorized', message: 'Geçersiz token' });
  }
}

function requireBusinessId(req, res, next) {
  if (req.businessId) return next();
  return res.status(400).json({
    code: 'business_id_required',
    message: 'Bu işlem için işletme seçimi gerekli. Super-admin iseniz X-Business-Id header veya query businessId gönderin.',
  });
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

function requireRole(role) {
  return (req, res, next) => {
    if (req.role === role) return next();
    return res.status(403).json({ code: 'forbidden', message: 'Bu işlem için yetkiniz yok' });
  };
}

module.exports = {
  authMiddleware,
  attachBusiness,
  requireBusinessId,
  requireRole,
  X_BUSINESS_ID,
};
