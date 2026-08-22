const userModel = require('../models/user.model');
const placeModel = require('../models/place.model');
const reviewModel = require('../models/review.model');
const checkinModel = require('../models/checkin.model');
const favoriteModel = require('../models/favorite.model');
const auditLogModel = require('../models/auditLog.model');
const { asyncHandler, ok, calcAge } = require('../utils/helper');
const { ApiError } = require('../middleware/errorHandler');
const { recordAuditLog } = require('../utils/auditLog');

function toPublicUser(u) {
  if (!u) return null;
  const { passwordHash, ...publicFields } = u;
  return { ...publicFields, age: calcAge(u.profile?.birthdate) };
}

const getDashboard = asyncHandler(async (req, res) => {
  const [users, places, reviews, checkinPosts, favoritesCount] = await Promise.all([
    userModel.getAllUsers(),
    placeModel.getAllPlaces(),
    reviewModel.getAllReviews(),
    checkinModel.getAllPosts(),
    favoriteModel.getFavoritesCount(),
  ]);

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
      .sort((a, b) => new Date(b.joinedAt || 0) - new Date(a.joinedAt || 0))
      .slice(0, 5)
      .map(toPublicUser),
    recentReviews: reviews.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5),
    recentVideos: videoReviews.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5),
    recentCheckins: checkinPosts.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5),
  });
});

const getAllUsers = asyncHandler(async (req, res) => {
  const rows = await userModel.getAllUsers();
  const sorted = rows.sort((a, b) => new Date(b.joinedAt || 0) - new Date(a.joinedAt || 0));
  return ok(res, { users: sorted.map(toPublicUser) });
});

const setUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body || {};
  if (role !== 'admin' && role !== 'user') throw new ApiError(400, 'role ต้องเป็น "admin" หรือ "user"');

  if (req.params.uid === req.user.uid && role === 'user') {
    throw new ApiError(400, 'ไม่สามารถถอดสิทธิ์แอดมินของตัวเองได้ ให้แอดมินคนอื่นถอดสิทธิ์ให้แทน');
  }

  const existing = await userModel.getUserById(req.params.uid);
  if (!existing) throw new ApiError(404, 'ไม่พบผู้ใช้นี้');
  const updated = await userModel.updateUser(req.params.uid, { role });
  await recordAuditLog(req, {
    action: role === 'admin' ? 'user.promote' : 'user.demote',
    targetType: 'user', targetId: req.params.uid, targetLabel: updated.name || updated.email,
  });
  return ok(res, { user: toPublicUser(updated) });
});

const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.uid === req.user.uid) {
    throw new ApiError(400, 'ไม่สามารถลบบัญชีของตัวเองได้');
  }

  const existing = await userModel.getUserById(req.params.uid);
  if (!existing) throw new ApiError(404, 'ไม่พบผู้ใช้นี้');

  await userModel.deleteUser(req.params.uid);
  await recordAuditLog(req, {
    action: 'user.delete',
    targetType: 'user',
    targetId: req.params.uid,
    targetLabel: existing.name || existing.email,
  });
  return ok(res, { deleted: true, uid: req.params.uid });
});

const getAllReviews = asyncHandler(async (req, res) => {
  const rows = await reviewModel.getAllReviews();
  const sorted = rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return ok(res, { reviews: sorted });
});

const getAllVideos = asyncHandler(async (req, res) => {
  const rows = await reviewModel.getVideoReviews();
  const sorted = rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return ok(res, { videos: sorted });
});

const getAllCheckins = asyncHandler(async (req, res) => {
  const rows = await checkinModel.getAllPosts();
  const sorted = rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return ok(res, { posts: sorted });
});

const getAuditLogs = asyncHandler(async (req, res) => {
  const rows = await auditLogModel.getRecentLogs(200);
  const sorted = rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return ok(res, { logs: sorted });
});

const deleteAuditLog = asyncHandler(async (req, res) => {
  await auditLogModel.deleteLog(req.params.id);
  return ok(res, { id: req.params.id, deleted: true });
});

const clearAuditLogs = asyncHandler(async (req, res) => {
  const deletedCount = await auditLogModel.deleteAllLogs();
  return ok(res, { deletedCount });
});

const purgeOldAuditLogs = asyncHandler(async (req, res) => {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 2);
  const cutoffIso = cutoff.toISOString();
  const deletedCount = await auditLogModel.deleteLogsOlderThan(cutoffIso);
  return ok(res, { deletedCount, cutoff: cutoffIso });
});

module.exports = {
  getDashboard, getAllUsers, setUserRole, deleteUser, getAllReviews, getAllVideos, getAllCheckins,
  getAuditLogs, deleteAuditLog, clearAuditLogs, purgeOldAuditLogs,
};
