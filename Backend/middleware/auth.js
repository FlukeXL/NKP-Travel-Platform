const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userModel = require('../models/user.model');
const { ApiError } = require('./errorHandler');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new ApiError(401, 'Missing Authorization Bearer token');

    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = { uid: decoded.uid, email: decoded.email, provider: decoded.provider || 'jwt' };
    next();
  } catch (err) {
    next(new ApiError(401, 'Invalid or expired session token'));
  }
}

async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = { uid: decoded.uid, email: decoded.email, provider: decoded.provider || 'jwt' };
  } catch {
  }
  next();
}

async function requireAdmin(req, res, next) {
  try {
    if (!req.user) throw new ApiError(401, 'Missing Authorization Bearer token');

    const doc = await userModel.getUserById(req.user.uid);
    const isEmailAdmin = env.ADMIN_EMAILS.includes((req.user.email || '').toLowerCase());
    const role = (doc && doc.role) || (isEmailAdmin ? 'admin' : 'user');

    if (role !== 'admin' && !isEmailAdmin) {
      throw new ApiError(403, 'สิทธิ์ผู้ดูแลระบบเท่านั้นที่เข้าถึงส่วนนี้ได้');
    }
    next();
  } catch (err) {
    next(err instanceof ApiError ? err : new ApiError(403, 'สิทธิ์ผู้ดูแลระบบเท่านั้นที่เข้าถึงส่วนนี้ได้'));
  }
}

module.exports = { requireAuth, optionalAuth, requireAdmin };
