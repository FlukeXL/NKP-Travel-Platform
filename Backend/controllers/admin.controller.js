const { isFirebaseReady } = require('../config/firebase');
const userModel = require('../models/user.model');
const placeModel = require('../models/place.model');
const reviewModel = require('../models/review.model');
const checkinModel = require('../models/checkin.model');
const devStore = require('../utils/devStore');
const { asyncHandler, ok, calcAge } = require('../utils/helper');
const { ApiError } = require('../middleware/errorHandler');
const { recordAuditLog } = require('../utils/auditLog');
const auditLogModel = require('../models/auditLog.model');

const DEV_USERS = 'auth_users';
const DEV_PLACES = 'places';
const DEV_REVIEWS = 'reviews';
const DEV_FAVORITES = 'favorites';
const DEV_CHECKIN_POSTS = 'checkin_posts';

function toPublicUser(u) {
  if (!u) return null;
  const { passwordHash, ...publicFields } = u;
  return { ...publicFields, age: calcAge(u.profile?.birthdate) };
}

const getDashboard = asyncHandler(async (req, res) => {
  let users, places, reviews, favoritesCount, checkinPosts;

  if (isFirebaseReady()) {
    [users, places, reviews, checkinPosts] = await Promise.all([
      userModel.getAllUsers(),
      placeModel.getAllPlaces(),
      reviewModel.getAllReviews(),
      checkinModel.getAllPosts(),
    ]);
    const { getDb, COLLECTIONS } = require('../config/database');
    const favSnap = await getDb().collection(COLLECTIONS.FAVORITES).count().get();
    favoritesCount = favSnap.data().count;
  } else {
    users = Object.values(devStore.readAll(DEV_USERS));
    places = Object.values(devStore.readAll(DEV_PLACES));
    reviews = Object.values(devStore.readAll(DEV_REVIEWS));
    favoritesCount = Object.values(devStore.readAll(DEV_FAVORITES)).length;
    checkinPosts = Object.values(devStore.readAll(DEV_CHECKIN_POSTS));
  }

  const placesByCategory = places.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const videoReviews = reviews.filter((r) => r.video);
  const totalPhotos = reviews.reduce((s, r) => s + (r.photos?.length || 0), 0);
  const totalLikes = reviews.reduce((s, r) => s + (r.likeCount || 0), 0);
  const totalComments = reviews.reduce((s, r) => s + (r.commentCount || 0), 0);
  const videosByCategory = videoReviews.reduce((acc, r) => {
    const key = r.category || 'ไม่ระบุหมวด';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const checkinLikes = checkinPosts.reduce((s, p) => s + (p.likeCount || 0), 0);
  const checkinComments = checkinPosts.reduce((s, p) => s + (p.commentCount || 0), 0);

  return ok(res, {
    totals: {
      users: users.length,
      admins: users.filter((u) => u.role === 'admin').length,
      places: places.length,
      publishedPlaces: places.filter((p) => p.published !== false).length,
      reviews: reviews.length,
      favorites: favoritesCount,
      videos: videoReviews.length,
      photos: totalPhotos,
      likes: totalLikes,
      comments: totalComments,
      checkinPosts: checkinPosts.length,
      checkinLikes,
      checkinComments,
    },
    placesByCategory,
    videosByCategory,
    avgRating,
    recentUsers: users
      .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))
      .slice(0, 5)
      .map(toPublicUser),
    recentReviews: reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
    recentVideos: videoReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
    recentCheckins: checkinPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
  });
});

const getAllUsers = asyncHandler(async (req, res) => {
  const rows = isFirebaseReady() ? await userModel.getAllUsers() : Object.values(devStore.readAll(DEV_USERS));
  const sorted = rows.sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));
  return ok(res, { users: sorted.map(toPublicUser) });
});

const setUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body || {};
  if (role !== 'admin' && role !== 'user') throw new ApiError(400, 'role ต้องเป็น "admin" หรือ "user"');

  if (req.params.uid === req.user.uid && role === 'user') {
    throw new ApiError(400, 'ไม่สามารถถอดสิทธิ์แอดมินของตัวเองได้ ให้แอดมินคนอื่นถอดสิทธิ์ให้แทน');
  }

  if (isFirebaseReady()) {
    const existing = await userModel.getUserById(req.params.uid);
    if (!existing) throw new ApiError(404, 'ไม่พบผู้ใช้นี้');
    const updated = await userModel.updateUser(req.params.uid, { role });
    await recordAuditLog(req, {
      action: role === 'admin' ? 'user.promote' : 'user.demote',
      targetType: 'user', targetId: req.params.uid, targetLabel: updated.name || updated.email,
    });
    return ok(res, { user: toPublicUser(updated) });
  }

  const existing = devStore.get(DEV_USERS, req.params.uid);
  if (!existing) throw new ApiError(404, 'ไม่พบผู้ใช้นี้');
  const merged = { ...existing, role };
  devStore.set(DEV_USERS, req.params.uid, merged);
  await recordAuditLog(req, {
    action: role === 'admin' ? 'user.promote' : 'user.demote',
    targetType: 'user', targetId: req.params.uid, targetLabel: merged.name || merged.email,
  });
  return ok(res, { user: toPublicUser(merged) });
});

const getAllReviews = asyncHandler(async (req, res) => {
  const rows = isFirebaseReady() ? await reviewModel.getAllReviews() : Object.values(devStore.readAll(DEV_REVIEWS));
  const sorted = rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return ok(res, { reviews: sorted });
});

const getAllVideos = asyncHandler(async (req, res) => {
  const rows = isFirebaseReady()
    ? await reviewModel.getVideoReviews()
    : Object.values(devStore.readAll(DEV_REVIEWS)).filter((r) => r.video);
  const sorted = rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return ok(res, { videos: sorted });
});

/** All check-in posts across the platform (public + private), newest first — powers the Admin Panel's "เช็คอิน" moderation tab. */
const getAllCheckins = asyncHandler(async (req, res) => {
  const rows = isFirebaseReady() ? await checkinModel.getAllPosts() : Object.values(devStore.readAll(DEV_CHECKIN_POSTS));
  const sorted = rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return ok(res, { posts: sorted });
});

/** Recent admin action history (who did what, when) — powers the Admin Panel's "Audit Log" tab. */
const getAuditLogs = asyncHandler(async (req, res) => {
  const rows = isFirebaseReady() ? await auditLogModel.getRecentLogs(200) : Object.values(devStore.readAll('audit_logs'));
  const sorted = rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return ok(res, { logs: sorted });
});

/** Deletes a single audit log entry by hand (manual cleanup). */
const deleteAuditLog = asyncHandler(async (req, res) => {
  if (isFirebaseReady()) {
    await auditLogModel.deleteLog(req.params.id);
  } else {
    devStore.remove('audit_logs', req.params.id);
  }
  return ok(res, { id: req.params.id, deleted: true });
});

/** Deletes ALL audit log entries at once ("ลบทั้งหมด" button). */
const clearAuditLogs = asyncHandler(async (req, res) => {
  let deletedCount;
  if (isFirebaseReady()) {
    deletedCount = await auditLogModel.deleteAllLogs();
  } else {
    const all = devStore.readAll('audit_logs');
    deletedCount = Object.keys(all).length;
    devStore.writeAll('audit_logs', {});
  }
  return ok(res, { deletedCount });
});

/** Manually triggers the same "delete logs older than 2 months" purge
 * that also runs automatically via cron (see server.js) — lets an
 * admin clean up immediately instead of waiting for the schedule. */
const purgeOldAuditLogs = asyncHandler(async (req, res) => {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 2);
  const cutoffIso = cutoff.toISOString();

  let deletedCount;
  if (isFirebaseReady()) {
    deletedCount = await auditLogModel.deleteLogsOlderThan(cutoffIso);
  } else {
    const all = devStore.readAll('audit_logs');
    const kept = {};
    let removed = 0;
    Object.entries(all).forEach(([id, log]) => {
      if (log.createdAt < cutoffIso) removed += 1;
      else kept[id] = log;
    });
    devStore.writeAll('audit_logs', kept);
    deletedCount = removed;
  }
  return ok(res, { deletedCount, cutoff: cutoffIso });
});

module.exports = {
  getDashboard, getAllUsers, setUserRole, getAllReviews, getAllVideos, getAllCheckins,
  getAuditLogs, deleteAuditLog, clearAuditLogs, purgeOldAuditLogs,
};
