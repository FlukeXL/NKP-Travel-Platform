const path = require('path');
const fs = require('fs');
const userModel = require('../models/user.model');
const { asyncHandler, ok, calcAge } = require('../utils/helper');
const { ApiError } = require('../middleware/errorHandler');
const { sanitizeProfile } = require('../utils/validator');
const { UPLOAD_DIR } = require('../middleware/upload');

function toPublicUser(u) {
  if (!u) return null;
  const { passwordHash, ...publicFields } = u;
  return { ...publicFields, age: calcAge(u.profile?.birthdate) };
}

function saveBase64Avatar(base64Str) {
  if (!base64Str || typeof base64Str !== 'string') return null;
  if (!base64Str.startsWith('data:image/')) return base64Str;
  try {
    const matches = base64Str.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches) return base64Str;
    const rawExt = matches[1].toLowerCase();
    const ext = rawExt === 'jpeg' ? '.jpg' : `.${rawExt}`;
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 12)}${safeExt}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
    return `/uploads/${filename}`;
  } catch (err) {
    console.warn('[user.controller] Failed to write base64 avatar to file:', err.message);
    return base64Str;
  }
}

const getUser = asyncHandler(async (req, res) => {
  const record = await userModel.getUserById(req.params.uid);
  if (!record) throw new ApiError(404, 'ไม่พบข้อมูลผู้ใช้');
  return ok(res, { user: toPublicUser(record) });
});

const updateUser = asyncHandler(async (req, res) => {
  if (req.user.uid !== req.params.uid) throw new ApiError(403, 'ไม่มีสิทธิ์แก้ไขข้อมูลผู้ใช้นี้');

  const patch = {};
  if (typeof req.body.name === 'string' && req.body.name.trim()) patch.name = req.body.name.trim();
  if (typeof req.body.avatar === 'string') {
    patch.avatar = saveBase64Avatar(req.body.avatar);
  }
  if (req.body.profile) patch.profile = sanitizeProfile(req.body.profile);

  const updated = await userModel.updateUser(req.params.uid, patch);
  if (!updated) throw new ApiError(404, 'ไม่พบข้อมูลผู้ใช้');
  return ok(res, { user: toPublicUser(updated) });
});

const updateAvatar = asyncHandler(async (req, res) => {
  if (req.user.uid !== req.params.uid) throw new ApiError(403, 'ไม่มีสิทธิ์แก้ไขรูปโปรไฟล์นี้');
  if (!req.file) throw new ApiError(400, 'กรุณาเลือกไฟล์รูปภาพที่ต้องการอัปโหลด');

  const avatarUrl = `/uploads/${req.file.filename}`;
  const updated = await userModel.updateUser(req.params.uid, { avatar: avatarUrl });
  if (!updated) throw new ApiError(404, 'ไม่พบข้อมูลผู้ใช้');
  return ok(res, { user: toPublicUser(updated), avatar: avatarUrl });
});

module.exports = { getUser, updateUser, updateAvatar };

