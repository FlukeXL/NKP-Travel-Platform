const { isFirebaseReady } = require('../config/firebase');
const eventModel = require('../models/event.model');
const devStore = require('../utils/devStore');
const { asyncHandler, ok } = require('../utils/helper');
const { ApiError } = require('../middleware/errorHandler');
const { recordAuditLog } = require('../utils/auditLog');

const DEV_EVENTS = 'events';

function devGetAllEvents() {
  return Object.values(devStore.readAll(DEV_EVENTS)).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
}

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
    out.dates = (body.dates || '').trim(); // human-readable Thai date string, e.g. "24 ต.ค. – 2 พ.ย."
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
    // Only one event can be the popup event at a time — enforced in
    // the frontend by picking the most recent active+showAsPopup event.
    out.showAsPopup = Boolean(body.showAsPopup);
  }
  return out;
}

/* Public — anyone (including guests) can read the active event list to
 * power the homepage cards and the event popup on page load. */
const getActiveEvents = asyncHandler(async (req, res) => {
  const rows = isFirebaseReady() ? await eventModel.getActiveEvents() : devGetAllEvents().filter((e) => e.active !== false);
  return ok(res, { events: rows });
});

/* Admin-only — list all events including inactive drafts. */
const getAllEvents = asyncHandler(async (req, res) => {
  const rows = isFirebaseReady() ? await eventModel.getAllEvents() : devGetAllEvents();
  return ok(res, { events: rows });
});

const createEvent = asyncHandler(async (req, res) => {
  const data = validateEventPayload(req.body || {});
  data.active = data.active !== undefined ? data.active : true;
  data.showAsPopup = data.showAsPopup !== undefined ? data.showAsPopup : false;

  if (isFirebaseReady()) {
    const doc = await eventModel.createEvent(data);
    await recordAuditLog(req, { action: 'event.create', targetType: 'event', targetId: doc.id, targetLabel: doc.title });
    return ok(res, { event: doc }, 201);
  }

  const id = `event_${Date.now()}`;
  const doc = { ...data, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  devStore.set(DEV_EVENTS, id, doc);
  await recordAuditLog(req, { action: 'event.create', targetType: 'event', targetId: id, targetLabel: data.title });
  return ok(res, { event: doc }, 201);
});

const updateEvent = asyncHandler(async (req, res) => {
  const patch = validateEventPayload(req.body || {}, { partial: true });

  if (isFirebaseReady()) {
    const existing = await eventModel.getEventById(req.params.id);
    if (!existing) throw new ApiError(404, 'ไม่พบกิจกรรมนี้');
    const doc = await eventModel.updateEvent(req.params.id, patch);
    await recordAuditLog(req, { action: 'event.update', targetType: 'event', targetId: req.params.id, targetLabel: doc.title });
    return ok(res, { event: doc });
  }

  const existing = devStore.get(DEV_EVENTS, req.params.id);
  if (!existing) throw new ApiError(404, 'ไม่พบกิจกรรมนี้');
  const merged = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  devStore.set(DEV_EVENTS, req.params.id, merged);
  await recordAuditLog(req, { action: 'event.update', targetType: 'event', targetId: req.params.id, targetLabel: merged.title });
  return ok(res, { event: merged });
});

const deleteEvent = asyncHandler(async (req, res) => {
  if (isFirebaseReady()) {
    const existing = await eventModel.getEventById(req.params.id);
    if (!existing) throw new ApiError(404, 'ไม่พบกิจกรรมนี้');
    await eventModel.deleteEvent(req.params.id);
    await recordAuditLog(req, { action: 'event.delete', targetType: 'event', targetId: req.params.id, targetLabel: existing.title });
    return ok(res, { id: req.params.id, deleted: true });
  }

  const existing = devStore.get(DEV_EVENTS, req.params.id);
  if (!existing) throw new ApiError(404, 'ไม่พบกิจกรรมนี้');
  devStore.remove(DEV_EVENTS, req.params.id);
  await recordAuditLog(req, { action: 'event.delete', targetType: 'event', targetId: req.params.id, targetLabel: existing.title });
  return ok(res, { id: req.params.id, deleted: true });
});

const uploadBanner = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'ไม่มีไฟล์ถูกอัปโหลด');
  const url = `/uploads/${req.file.filename}`;
  return ok(res, { url });
});

module.exports = { getActiveEvents, getAllEvents, createEvent, updateEvent, deleteEvent, uploadBanner };
