const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const env = require('../config/env');
const { users: appwriteUsers, isAppwriteReady, ID } = require('../config/appwrite');
const userModel = require('../models/user.model');
const devStore = require('../utils/devStore');
const { asyncHandler, ok, calcAge } = require('../utils/helper');
const { ApiError } = require('../middleware/errorHandler');
const { isValidEmail, isValidPassword, sanitizeProfile } = require('../utils/validator');
const aiService = require('../services/ai.service');

const DEV_USERS = 'auth_users';

function sanitizeAvatarUrl(avatar) {
  if (!avatar || typeof avatar !== 'string') return null;
  if (avatar.startsWith('data:')) return null; // strip base64 — too large and replaced by file upload
  return avatar;
}

function toPublicUser(u) {
  if (!u) return null;
  const { passwordHash, ...publicFields } = u;
  return {
    ...publicFields,
    avatar: sanitizeAvatarUrl(publicFields.avatar),
    age: calcAge(u.profile?.birthdate),
  };
}

function signToken(uid, email, provider = 'email') {
  return jwt.sign({ uid, email, provider }, env.JWT_SECRET, { expiresIn: '30d' });
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body || {};
  const profile = sanitizeProfile(req.body?.profile);

  if (!name || !name.trim()) throw new ApiError(400, 'กรุณากรอกชื่อของคุณ');
  if (!isValidEmail(email)) throw new ApiError(400, 'กรุณากรอกอีเมลให้ถูกต้อง');
  if (!isValidPassword(password)) throw new ApiError(400, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');

  const normalizedEmail = email.trim().toLowerCase();

  // AI step: Age-aware travel persona
  const aiProfile = await aiService.analyzeSignupProfile(profile);

  let uid = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);

  if (isAppwriteReady()) {
    try {
      // Create user in Appwrite Users
      const appwriteUser = await appwriteUsers.create(
        ID.unique(),
        normalizedEmail,
        undefined,
        password,
        name
      );
      uid = appwriteUser.$id;
    } catch (err) {
      if (err.code === 409) throw new ApiError(409, 'อีเมลนี้ถูกใช้สมัครสมาชิกไปแล้ว');
      console.warn('[auth.controller] Appwrite create user warning:', err.message);
    }
  } else {
    const existing = devStore.findOne(DEV_USERS, (u) => u.email === normalizedEmail);
    if (existing) throw new ApiError(409, 'อีเมลนี้ถูกใช้สมัครสมาชิกไปแล้ว');
  }

  const doc = await userModel.createUser(uid, {
    name,
    email: normalizedEmail,
    provider: 'email',
    avatar: null,
    profile,
    aiProfile,
    // Pass passwordHash so it gets stored in Appwrite — enables login from any device
    passwordHash,
  });

  // Also save to devStore (with hash) as local cache
  const devRecord = {
    ...doc,
    passwordHash,
  };
  devStore.set(DEV_USERS, uid, devRecord);

  const token = signToken(uid, normalizedEmail, 'email');
  return ok(res, { user: toPublicUser(doc), token, tokenType: 'jwt' }, 201);
});

async function findUserByEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Check local devStore first (fastest — has passwordHash cached)
  let record = devStore.findOne(DEV_USERS, (u) => (u.email || '').toLowerCase() === normalizedEmail);
  if (record) return record;

  // 2. Search Appwrite Database by email field (includes passwordHash)
  if (isAppwriteReady()) {
    try {
      const { getDatabases, databaseId, COLLECTIONS, Query } = require('../config/database');
      const res = await getDatabases().listDocuments(databaseId, COLLECTIONS.USERS, [
        Query.equal('email', normalizedEmail),
        Query.limit(1),
      ]);
      if (res.documents.length > 0) {
        const doc = res.documents[0];
        const formatted = userModel.formatUserPublic ? userModel.formatUserPublic(doc) : null;
        // Build record manually with passwordHash included
        record = {
          uid: doc.uid || doc.$id,
          name: doc.name || '',
          email: doc.email || '',
          avatar: doc.avatar || null,
          provider: doc.provider || 'email',
          role: doc.role || 'user',
          joinedAt: doc.joinedAt || doc.$createdAt || '',
          profile: (() => {
            if (doc.profile && typeof doc.profile === 'object') return doc.profile;
            if (typeof doc.profile === 'string') { try { return JSON.parse(doc.profile); } catch {} }
            return { birthdate: doc.birthdate || null, interests: doc.interests || [], envPref: doc.envPref || 'both', pacePref: doc.pacePref || 'both' };
          })(),
          passwordHash: doc.passwordHash || '',
        };
        // Cache into devStore for next time
        devStore.set(DEV_USERS, record.uid, record);
      }
    } catch (err) {
      // Fallback to Appwrite Users service if Database search fails
      try {
        const list = await appwriteUsers.list();
        const matched = list.users.find((u) => (u.email || '').toLowerCase() === normalizedEmail);
        if (matched) {
          const doc = await userModel.getUserWithHashById(matched.$id);
          if (doc) {
            record = { ...doc, uid: doc.uid || matched.$id };
            devStore.set(DEV_USERS, record.uid, record);
          }
        }
      } catch (err2) {
        console.warn('[auth.controller] Appwrite find user warning:', err2.message);
      }
    }
  }
  return record;
}


const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!isValidEmail(email)) throw new ApiError(400, 'กรุณากรอกอีเมลให้ถูกต้อง');
  if (!password) throw new ApiError(400, 'กรุณากรอกรหัสผ่าน');

  const normalizedEmail = email.trim().toLowerCase();

  // Find user by email (checks devStore first, then Appwrite with hash)
  let record = await findUserByEmail(normalizedEmail);

  if (!record) {
    throw new ApiError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  }

  if (record.passwordHash) {
    // Verify password against stored bcrypt hash
    const match = await bcrypt.compare(password, record.passwordHash);
    if (!match) throw new ApiError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  } else if (record.provider === 'email') {
    // No hash found — this user registered before cross-device login was supported.
    // We cannot verify without hash, so reject and prompt re-register or contact admin.
    console.warn(`[auth.controller] Login attempt for ${normalizedEmail} has no passwordHash stored.`);
    throw new ApiError(401, 'ไม่พบข้อมูลรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบหรือลงทะเบียนใหม่');
  }
  // provider === 'google' skip password check (OAuth users have no password)

  record = await mnxMaybePromoteBootstrapAdmin(record.uid, record);
  const token = signToken(record.uid, normalizedEmail, record.provider || 'email');
  return ok(res, { user: toPublicUser(record), token, tokenType: 'jwt' });
});

async function mnxMaybePromoteBootstrapAdmin(uid, doc) {
  if (!doc || doc.role === 'admin') return doc;
  if (!env.ADMIN_EMAILS.includes((doc.email || '').toLowerCase())) return doc;

  const updated = await userModel.updateUser(uid, { role: 'admin' });
  const devRec = devStore.get(DEV_USERS, uid);
  if (devRec) {
    devRec.role = 'admin';
    devStore.set(DEV_USERS, uid, devRec);
  }
  return updated;
}

const me = asyncHandler(async (req, res) => {
  let doc = await userModel.getUserById(req.user.uid);
  if (!doc) {
    doc = devStore.get(DEV_USERS, req.user.uid);
  }
  if (!doc) throw new ApiError(404, 'ไม่พบข้อมูลผู้ใช้');
  doc = await mnxMaybePromoteBootstrapAdmin(req.user.uid, doc);
  return ok(res, { user: toPublicUser(doc) });
});

const logout = asyncHandler(async (req, res) => {
  return ok(res, { message: 'ออกจากระบบสำเร็จ' });
});

const google = asyncHandler(async (req, res) => {
  const { idToken, name, email, avatar } = req.body || {};
  const userEmail = (email || '').trim().toLowerCase();
  if (!userEmail) throw new ApiError(400, 'Missing email for Google sign-in');

  let record = await findUserByEmail(userEmail);
  let uid = record?.uid || uuidv4();

  if (!record) {
    record = await userModel.createUser(uid, {
      name: name || userEmail.split('@')[0],
      email: userEmail,
      provider: 'google',
      avatar: avatar || null,
      profile: {},
    });
    devStore.set(DEV_USERS, uid, record);
  }

  record = await mnxMaybePromoteBootstrapAdmin(uid, record);
  const token = signToken(uid, userEmail, 'google');
  return ok(res, { user: toPublicUser(record), token, tokenType: 'jwt' });
});

module.exports = { register, login, me, logout, google };
