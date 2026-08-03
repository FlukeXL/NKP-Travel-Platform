const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const env = require('../config/env');
const { isFirebaseReady, auth: firebaseAuth } = require('../config/firebase');
const userModel = require('../models/user.model');
const devStore = require('../utils/devStore');
const { asyncHandler, ok, calcAge } = require('../utils/helper');
const { ApiError } = require('../middleware/errorHandler');
const { isValidEmail, isValidPassword, sanitizeProfile } = require('../utils/validator');
const aiService = require('../services/ai.service');

const DEV_USERS = 'auth_users';

function toPublicUser(u) {
  if (!u) return null;
  const { passwordHash, ...publicFields } = u;
  return { ...publicFields, age: calcAge(u.profile?.birthdate) };
}

function signDevToken(uid, email) {
  return jwt.sign({ uid, email }, env.JWT_SECRET, { expiresIn: '30d' });
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body || {};
  const profile = sanitizeProfile(req.body?.profile);

  if (!name || !name.trim()) throw new ApiError(400, 'กรุณากรอกชื่อของคุณ');
  if (!isValidEmail(email)) throw new ApiError(400, 'กรุณากรอกอีเมลให้ถูกต้อง');
  if (!isValidPassword(password)) throw new ApiError(400, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');

  // AI step: send the birthdate + self-picked interests/env/pace to
  // Google Gemini (gemini-2.5-flash) to infer an age-aware travel
  // persona and a ranked category list — richer than the plain
  // hardcoded age-bracket lookup the old recommender used. Runs
  // BEFORE account creation so the result can be saved on the user
  // doc in one write; if Gemini isn't configured or errors out, this
  // resolves to null and signup proceeds completely normally (the
  // frontend recommender already knows how to fall back).
  const aiProfile = await aiService.analyzeSignupProfile(profile);

  if (isFirebaseReady()) {
    let userRecord;
    try {
      userRecord = await firebaseAuth.createUser({ email, password, displayName: name });
    } catch (err) {
      if (err.code === 'auth/email-already-exists') throw new ApiError(409, 'อีเมลนี้ถูกใช้สมัครสมาชิกไปแล้ว');
      throw new ApiError(400, err.message || 'ไม่สามารถสร้างบัญชีได้');
    }

    const doc = await userModel.createUser(userRecord.uid, {
      name,
      email,
      provider: 'email',
      avatar: userRecord.photoURL || null,
      profile,
      aiProfile,
    });

    const customToken = await firebaseAuth.createCustomToken(userRecord.uid);
    return ok(res, { user: toPublicUser(doc), token: customToken, tokenType: 'firebase-custom' }, 201);
  }

  const existing = devStore.findOne(DEV_USERS, (u) => u.email === email);
  if (existing) throw new ApiError(409, 'อีเมลนี้ถูกใช้สมัครสมาชิกไปแล้ว');

  const uid = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);
  const record = {
    uid,
    name,
    email,
    passwordHash,
    avatar: null,
    provider: 'email',
    role: env.ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'user',
    joinedAt: new Date().toISOString(),
    profile: {
      birthdate: profile.birthdate || null,
      interests: profile.interests || [],
      envPref: profile.envPref || 'both',
      pacePref: profile.pacePref || 'both',
    },
    aiProfile,
  };
  devStore.set(DEV_USERS, uid, record);

  const token = signDevToken(uid, email);
  return ok(res, { user: toPublicUser(record), token, tokenType: 'jwt-dev' }, 201);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!isValidEmail(email)) throw new ApiError(400, 'กรุณากรอกอีเมลให้ถูกต้อง');
  if (!password) throw new ApiError(400, 'กรุณากรอกรหัสผ่าน');

  if (isFirebaseReady()) {
    let userRecord;
    try {
      userRecord = await firebaseAuth.getUserByEmail(email);
    } catch {
      throw new ApiError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
    let doc = await userModel.getUserById(userRecord.uid);
    doc = await mnxMaybePromoteBootstrapAdmin(userRecord.uid, doc);
    const customToken = await firebaseAuth.createCustomToken(userRecord.uid);
    return ok(res, { user: toPublicUser(doc), token: customToken, tokenType: 'firebase-custom' });
  }

  let record = devStore.findOne(DEV_USERS, (u) => u.email === email);
  if (!record) throw new ApiError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');

  const match = await bcrypt.compare(password, record.passwordHash);
  if (!match) throw new ApiError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');

  record = await mnxMaybePromoteBootstrapAdmin(record.uid, record);
  const token = signDevToken(record.uid, record.email);
  return ok(res, { user: toPublicUser(record), token, tokenType: 'jwt-dev' });
});

async function mnxMaybePromoteBootstrapAdmin(uid, doc) {
  if (!doc || doc.role === 'admin') return doc;
  if (!env.ADMIN_EMAILS.includes((doc.email || '').toLowerCase())) return doc;

  if (isFirebaseReady()) {
    return userModel.updateUser(uid, { role: 'admin' });
  }
  const updated = { ...doc, role: 'admin' };
  devStore.set(DEV_USERS, uid, updated);
  return updated;
}

const me = asyncHandler(async (req, res) => {
  if (isFirebaseReady()) {
    let doc = await userModel.getUserById(req.user.uid);
    if (!doc) throw new ApiError(404, 'ไม่พบข้อมูลผู้ใช้');
    doc = await mnxMaybePromoteBootstrapAdmin(req.user.uid, doc);
    return ok(res, { user: toPublicUser(doc) });
  }

  let record = devStore.get(DEV_USERS, req.user.uid);
  if (!record) throw new ApiError(404, 'ไม่พบข้อมูลผู้ใช้');
  record = await mnxMaybePromoteBootstrapAdmin(req.user.uid, record);
  return ok(res, { user: toPublicUser(record) });
});

const logout = asyncHandler(async (req, res) => {
  return ok(res, { message: 'ออกจากระบบสำเร็จ' });
});

const google = asyncHandler(async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) throw new ApiError(400, 'Missing idToken');
  if (!isFirebaseReady()) throw new ApiError(503, 'เข้าสู่ระบบด้วย Google ต้องตั้งค่า Firebase ก่อน');

  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(idToken);
  } catch {
    throw new ApiError(401, 'โทเคนของ Google ไม่ถูกต้องหรือหมดอายุ');
  }

  const { uid, email, name, picture } = decoded;
  let doc = await userModel.getUserById(uid);

  if (!doc) {
    doc = await userModel.createUser(uid, {
      name: name || email?.split('@')[0] || 'ผู้ใช้งาน',
      email,
      provider: 'google',
      avatar: picture || null,
      profile: {},
    });
  }

  const customToken = await firebaseAuth.createCustomToken(uid);
  return ok(res, { user: toPublicUser(doc), token: customToken, tokenType: 'firebase-custom' });
});

module.exports = { register, login, me, logout, google };
