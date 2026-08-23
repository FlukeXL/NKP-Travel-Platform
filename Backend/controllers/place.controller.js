const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const placeModel = require('../models/place.model');
const { asyncHandler, ok } = require('../utils/helper');
const { ApiError } = require('../middleware/errorHandler');
const { safeUnlink } = require('../utils/video');
const { UPLOAD_DIR } = require('../middleware/upload');
const { recordAuditLog } = require('../utils/auditLog');
const { sanitizeAppwriteId } = require('../utils/sanitizeId');

const VALID_CATEGORIES = ['cafe', 'restaurant', 'temple', 'fitness', 'nature', 'landmark', 'culture', 'mutelu', 'shopping'];

function slugify(name) {
  return (
    String(name || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 24)
  );
}

function validatePlacePayload(body, { partial = false } = {}) {
  const out = {};

  if (!partial || body.name !== undefined) {
    if (!body.name || !body.name.trim()) throw new ApiError(400, 'กรุณากรอกชื่อสถานที่');
    out.name = body.name.trim();
  }
  if (!partial || body.category !== undefined) {
    if (!body.category || !VALID_CATEGORIES.includes(body.category)) {
      throw new ApiError(400, `หมวดหมู่ไม่ถูกต้อง ต้องเป็นหนึ่งใน: ${VALID_CATEGORIES.join(', ')}`);
    }
    out.category = body.category;
  }
  if (!partial || body.category2 !== undefined) {
    if (body.category2 && !VALID_CATEGORIES.includes(body.category2)) {
      throw new ApiError(400, `หมวดหมู่รองไม่ถูกต้อง`);
    }
    out.category2 = body.category2 || null;
  }
  if (!partial || body.desc !== undefined) {
    if (!body.desc || !body.desc.trim()) throw new ApiError(400, 'กรุณากรอกคำอธิบายสถานที่');
    out.desc = body.desc.trim();
  }
  if (!partial || body.area !== undefined) {
    if (!body.area || !body.area.trim()) throw new ApiError(400, 'กรุณากรอกพื้นที่/อำเภอ');
    out.area = body.area.trim();
  }
  if (!partial || body.price !== undefined) {
    if (!body.price || !body.price.trim()) throw new ApiError(400, 'กรุณากรอกช่วงราคา (เช่น ฟรี, ฿, ฿฿, ฿฿฿)');
    out.price = body.price.trim();
  }
  if (!partial || body.img !== undefined) {
    if (!body.img || !body.img.trim()) throw new ApiError(400, 'กรุณากรอก URL รูปภาพหลัก');
    out.img = body.img.trim();
  }
  if (!partial || body.lat !== undefined) {
    const lat = Number(body.lat);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) throw new ApiError(400, 'ละติจูดไม่ถูกต้อง');
    out.lat = lat;
  }
  if (!partial || body.lng !== undefined) {
    const lng = Number(body.lng);
    if (Number.isNaN(lng) || lng < -180 || lng > 180) throw new ApiError(400, 'ลองจิจูดไม่ถูกต้อง');
    out.lng = lng;
  }
  if (!partial || body.rating !== undefined) {
    const rating = body.rating === undefined || body.rating === '' ? 4.5 : Number(body.rating);
    if (Number.isNaN(rating) || rating < 1 || rating > 5) throw new ApiError(400, 'คะแนนต้องอยู่ระหว่าง 1-5');
    out.rating = rating;
  }
  if (body.images !== undefined) {
    out.images = Array.isArray(body.images) ? body.images.filter((s) => typeof s === 'string' && s.trim()) : [];
  }
  if (body.popularity !== undefined) {
    const popularity = Number(body.popularity);
    out.popularity = Number.isNaN(popularity) ? 0 : Math.max(0, Math.round(popularity));
  }
  if (body.published !== undefined) {
    out.published = Boolean(body.published);
  }

  return out;
}

const getAllPlaces = asyncHandler(async (req, res) => {
  const rows = await placeModel.getAllPlaces();
  const sorted = rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return ok(res, { places: sorted });
});

const getPlace = asyncHandler(async (req, res) => {
  const record = await placeModel.getPlaceById(req.params.id);
  if (!record) throw new ApiError(404, 'ไม่พบสถานที่นี้');
  return ok(res, { place: record });
});

const createPlace = asyncHandler(async (req, res) => {
  const data = validatePlacePayload(req.body || {});
  if (!data.images?.length) delete data.images;
  data.popularity = data.popularity ?? 0;
  data.published = data.published !== undefined ? data.published : true;

  let rawSlug = slugify(data.name);
  if (!rawSlug || !/^[a-z0-9]/.test(rawSlug)) {
    rawSlug = `place-${uuidv4().slice(0, 8)}`;
  } else {
    rawSlug = `${rawSlug.slice(0, 20)}-${uuidv4().slice(0, 6)}`;
  }

  const rawId = req.body?.id?.trim() || rawSlug;
  const id = sanitizeAppwriteId(rawId, 'place');

  const existing = await placeModel.getPlaceById(id);
  if (existing) throw new ApiError(409, 'มีสถานที่ที่ใช้ id นี้อยู่แล้ว');

  const doc = await placeModel.createPlace(id, data);
  await recordAuditLog(req, { action: 'place.create', targetType: 'place', targetId: id, targetLabel: data.name, details: { category: data.category } });
  return ok(res, { place: doc }, 201);
});

const { uploadToAppwriteStorage, deleteFromAppwriteStorage } = require('../utils/storage');

function cleanupPlacePhotos(place) {
  if (!place) return;
  const urls = [place.img, ...(place.images || [])].filter((u) => typeof u === 'string');
  [...new Set(urls)].forEach((url) => {
    if (url.startsWith('/uploads/')) safeUnlink(path.join(UPLOAD_DIR, path.basename(url)));
    else if (url.includes('appwrite.io')) deleteFromAppwriteStorage(url);
  });
}

function cleanupRemovedPlacePhotos(before, after) {
  if (!before || !after) return;
  const beforeUrls = [before.img, ...(before.images || [])].filter((u) => typeof u === 'string');
  const afterUrls = new Set([after.img, ...(after.images || [])]);
  [...new Set(beforeUrls)].filter((u) => !afterUrls.has(u)).forEach((url) => {
    if (url.startsWith('/uploads/')) safeUnlink(path.join(UPLOAD_DIR, path.basename(url)));
    else if (url.includes('appwrite.io')) deleteFromAppwriteStorage(url);
  });
}

function placeUpdateAuditEntry(placeId, label, patch) {
  const isPublishOnlyToggle = Object.keys(patch).length === 1 && patch.published !== undefined;
  if (isPublishOnlyToggle) {
    return { action: patch.published ? 'place.publish' : 'place.unpublish', targetType: 'place', targetId: placeId, targetLabel: label };
  }
  return { action: 'place.update', targetType: 'place', targetId: placeId, targetLabel: label, details: { fields: Object.keys(patch) } };
}

const updatePlace = asyncHandler(async (req, res) => {
  const patch = validatePlacePayload(req.body || {}, { partial: true });
  const existing = await placeModel.getPlaceById(req.params.id);
  if (!existing) throw new ApiError(404, 'ไม่พบสถานที่นี้');

  const doc = await placeModel.updatePlace(req.params.id, patch);
  if (patch.img !== undefined || patch.images !== undefined) cleanupRemovedPlacePhotos(existing, doc);
  await recordAuditLog(req, placeUpdateAuditEntry(req.params.id, doc.name, patch));
  return ok(res, { place: doc });
});

const deletePlace = asyncHandler(async (req, res) => {
  const existing = await placeModel.getPlaceById(req.params.id);
  if (!existing) throw new ApiError(404, 'ไม่พบสถานที่นี้');

  await placeModel.deletePlace(req.params.id);
  cleanupPlacePhotos(existing);
  await recordAuditLog(req, { action: 'place.delete', targetType: 'place', targetId: req.params.id, targetLabel: existing.name });
  return ok(res, { id: req.params.id, deleted: true });
});

const uploadPlacePhotos = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (!files.length) throw new ApiError(400, 'กรุณาเลือกไฟล์รูปภาพอย่างน้อย 1 รูป');
  
  const urls = await Promise.all(files.map(async (f) => {
    const url = await uploadToAppwriteStorage(f.path, f.originalname);
    try { fs.unlinkSync(f.path); } catch (e) {}
    return url;
  }));

  return ok(res, { urls }, 201);
});

module.exports = { getAllPlaces, getPlace, createPlace, updatePlace, deletePlace, uploadPlacePhotos, VALID_CATEGORIES };
