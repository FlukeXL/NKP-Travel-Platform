const { isFirebaseReady } = require('../config/firebase');
const userModel = require('../models/user.model');
const devStore = require('../utils/devStore');
const { asyncHandler, ok, calcAge } = require('../utils/helper');
const { ApiError } = require('../middleware/errorHandler');
const { sanitizeProfile } = require('../utils/validator');

const DEV_USERS = 'auth_users';

function toPublicUser(u) {
  if (!u) return null;
  const { passwordHash, ...publicFields } = u;
  return { ...publicFields, age: calcAge(u.profile?.birthdate) };
}

const getUser = asyncHandler(async (req, res) => {
  const record = isFirebaseReady() ? await userModel.getUserById(req.params.uid) : devStore.get(DEV_USERS, req.params.uid);
  if (!record) throw new ApiError(404, 'ไม่พบข้อมูลผู้ใช้');
  return ok(res, { user: toPublicUser(record) });
});

const updateUser = asyncHandler(async (req, res) => {
  if (req.user.uid !== req.params.uid) throw new ApiError(403, 'ไม่มีสิทธิ์แก้ไขข้อมูลผู้ใช้นี้');

  const patch = {};
  if (typeof req.body.name === 'string' && req.body.name.trim()) patch.name = req.body.name.trim();
  if (typeof req.body.avatar === 'string') patch.avatar = req.body.avatar;
  if (req.body.profile) patch.profile = sanitizeProfile(req.body.profile);

  if (isFirebaseReady()) {
    const updated = await userModel.updateUser(req.params.uid, patch);
    return ok(res, { user: toPublicUser(updated) });
  }

  const record = devStore.get(DEV_USERS, req.params.uid);
  if (!record) throw new ApiError(404, 'ไม่พบข้อมูลผู้ใช้');
  const merged = {
    ...record,
    ...patch,
    profile: { ...record.profile, ...(patch.profile || {}) },
  };
  devStore.set(DEV_USERS, req.params.uid, merged);
  return ok(res, { user: toPublicUser(merged) });
});

module.exports = { getUser, updateUser };
