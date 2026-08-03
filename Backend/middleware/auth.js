const jwt = require('jsonwebtoken');
const { auth: firebaseAuth, isFirebaseReady } = require('../config/firebase');
const env = require('../config/env');
const { ApiError } = require('./errorHandler');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new ApiError(401, 'Missing Authorization Bearer token');

    if (isFirebaseReady()) {
      const decoded = await firebaseAuth.verifyIdToken(token);
      req.user = { uid: decoded.uid, email: decoded.email, provider: 'firebase' };
    } else {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = { uid: decoded.uid, email: decoded.email, provider: 'jwt-dev' };
    }
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
    if (isFirebaseReady()) {
      const decoded = await firebaseAuth.verifyIdToken(token);
      req.user = { uid: decoded.uid, email: decoded.email, provider: 'firebase' };
    } else {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = { uid: decoded.uid, email: decoded.email, provider: 'jwt-dev' };
    }
  } catch {
  }
  next();
}

/**
 * Gate for the Admin Panel + all admin-only API routes (places CRUD,
 * review moderation, user role management). Must run AFTER requireAuth
 * so req.user is already populated — looks up the caller's stored role
 * (Firestore `users` doc, or the devStore fallback record) and rejects
 * with 403 if it isn't "admin". Checked fresh on every request rather
 * than trusted from the JWT/ID token, so revoking someone's admin
 * access takes effect immediately without waiting for their token to
 * expire.
 */
async function requireAdmin(req, res, next) {
  try {
    if (!req.user) throw new ApiError(401, 'Missing Authorization Bearer token');

    let role;
    if (isFirebaseReady()) {
      const userModel = require('../models/user.model');
      const doc = await userModel.getUserById(req.user.uid);
      role = doc?.role;
    } else {
      const devStore = require('../utils/devStore');
      const record = devStore.get('auth_users', req.user.uid);
      role = record?.role;
    }

    if (role !== 'admin') throw new ApiError(403, 'สิทธิ์ผู้ดูแลระบบเท่านั้นที่เข้าถึงส่วนนี้ได้');
    next();
  } catch (err) {
    next(err instanceof ApiError ? err : new ApiError(403, 'สิทธิ์ผู้ดูแลระบบเท่านั้นที่เข้าถึงส่วนนี้ได้'));
  }
}

module.exports = { requireAuth, optionalAuth, requireAdmin };
