const eventModel = require('../models/event.model');
const { asyncHandler, ok } = require('../utils/helper');
const { ApiError } = require('../middleware/errorHandler');
const { recordAuditLog } = require('../utils/auditLog');

function validateEventPayload(body, { partial = false } = {}) {
  const out = {};
  if (!partial || body.title !== undefined) {
    if (!body.title?.trim()) throw new ApiError(400, 'กรุณากรอกชื่องาน/เทศกาล');
    out.title = body.title.trim();
  }
  if (!partial || body.tag !== undefined) {
    out.tag = (body.tag || '').trim() || 'กิจกรรม';
  }
  if (!partial || body.desc !== undefined) {
    out.desc = (body.desc || '').trim();
  }
  if (!partial || body.location !== undefined) {
    out.location = (body.location || '').trim();
  }
  if (!partial || body.startDate !== undefined) {
    if (!body.startDate) throw new ApiError(400, 'กรุณาระบุวันเริ่มงาน');
    out.startDate = body.startDate;
  }
  if (!partial || body.endDate !== undefined) {
    if (!body.endDate) throw new ApiError(400, 'กรุณาระบุวันสิ้นสุดงาน');
    out.endDate = body.endDate;
  }
  if (!partial || body.dates !== undefined) {
    out.dates = (body.dates || '').trim();
  }
  if (!partial || body.banner !== undefined) {
    out.banner = (body.banner || '').trim() || null;
  }
  if (!partial || body.ctaHref !== undefined) {
    out.ctaHref = (body.ctaHref || '').trim() || '/Fronend/pages/events.html';
  }
  if (!partial || body.badge !== undefined) {
    out.badge = (body.badge || '').trim() || 'กิจกรรม';
  }
  if (body.active !== undefined) {
    out.active = Boolean(body.active);
  }
  if (body.showAsPopup !== undefined) {
    out.showAsPopup = Boolean(body.showAsPopup);
  }
  return out;
}

const getActiveEvents = asyncHandler(async (req, res) => {
  const rows = await eventModel.getActiveEvents();
  return ok(res, { events: rows });
});

const getAllEvents = asyncHandler(async (req, res) => {
  const rows = await eventModel.getAllEvents();
  return ok(res, { events: rows });
});

const createEvent = asyncHandler(async (req, res) => {
  const data = validateEventPayload(req.body || {});
  data.active = data.active !== undefined ? data.active : true;
  data.showAsPopup = data.showAsPopup !== undefined ? data.showAsPopup : false;

  const doc = await eventModel.createEvent(data);
  await recordAuditLog(req, { action: 'event.create', targetType: 'event', targetId: doc.id, targetLabel: doc.title });
  return ok(res, { event: doc }, 201);
});

const updateEvent = asyncHandler(async (req, res) => {
  const patch = validateEventPayload(req.body || {}, { partial: true });
  const existing = await eventModel.getEventById(req.params.id);
  if (!existing) throw new ApiError(404, 'ไม่พบกิจกรรมนี้');

  const doc = await eventModel.updateEvent(req.params.id, patch);
  await recordAuditLog(req, { action: 'event.update', targetType: 'event', targetId: req.params.id, targetLabel: doc.title });
  return ok(res, { event: doc });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const existing = await eventModel.getEventById(req.params.id);
  if (!existing) throw new ApiError(404, 'ไม่พบกิจกรรมนี้');

  await eventModel.deleteEvent(req.params.id);
  await recordAuditLog(req, { action: 'event.delete', targetType: 'event', targetId: req.params.id, targetLabel: existing.title });
  return ok(res, { id: req.params.id, deleted: true });
});

const uploadBanner = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'ไม่มีไฟล์ถูกอัปโหลด');
  const url = `/uploads/${req.file.filename}`;
  return ok(res, { url });
});

module.exports = { getActiveEvents, getAllEvents, createEvent, updateEvent, deleteEvent, uploadBanner };
