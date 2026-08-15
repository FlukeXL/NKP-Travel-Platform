const path = require('path');
const reviewModel = require('../models/review.model');
const checkinModel = require('../models/checkin.model');
const userModel = require('../models/user.model');
const { asyncHandler, ok } = require('../utils/helper');
const { ApiError } = require('../middleware/errorHandler');
const { getVideoDurationSeconds, safeUnlink, generateVideoPoster } = require('../utils/video');
const { UPLOAD_DIR, VIDEO_UPLOAD_DIR } = require('../middleware/upload');
const { recordAuditLog } = require('../utils/auditLog');

const MAX_VIDEO_SECONDS = 61;
const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024;
const VALID_CATEGORIES = ['cafe', 'restaurant', 'temple', 'fitness', 'nature', 'landmark', 'culture', 'mutelu', 'shopping', 'event'];

function normalizeCategory(cat) {
  if (!cat) return null;
  const c = String(cat).toLowerCase().trim();
  if (c === 'restaurant' || c === 'food' || c === 'dining') return 'restaurant';
  if (c === 'cafe' || c === 'coffee') return 'cafe';
  if (c === 'temple' || c === 'wat') return 'temple';
  if (c === 'mutelu' || c === 'sacred') return 'mutelu';
  if (c === 'shopping' || c === 'market') return 'shopping';
  if (c === 'culture' || c === 'heritage' || c === 'landmark' || c === 'attraction') return 'culture';
  if (c === 'nature' || c === 'park') return 'nature';
  if (c === 'fitness' || c === 'health' || c === 'sports') return 'fitness';
  return c;
}

async function resolveAuthorInfo(req) {
  let author = req.user.email;
  let avatar = null;
  const profile = await userModel.getUserById(req.user.uid);
  if (profile) {
    author = profile.name || author;
    avatar = profile.avatar || null;
  }
  return { author, avatar };
}

const getReviews = asyncHandler(async (req, res) => {
  const { placeId } = req.params;
  const rows = await reviewModel.getReviewsByPlace(placeId);
  const stats = rows.length
    ? { avg: rows.reduce((s, r) => s + r.rating, 0) / rows.length, count: rows.length }
    : null;
  return ok(res, { placeId, reviews: rows, stats });
});

const addReview = asyncHandler(async (req, res) => {
  const { placeId } = req.params;
  const rating = Number(req.body?.rating);
  const text = (req.body?.text || '').trim();
  const category = req.body?.category || null;

  const photoFiles = req.files?.photos || [];
  const videoFile = req.files?.video?.[0] || null;

  try {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ApiError(400, 'กรุณาให้คะแนน 1-5 ดาว');
    if (!text) throw new ApiError(400, 'กรุณาเขียนรีวิวก่อนโพสต์');
    if (category && !VALID_CATEGORIES.includes(category)) {
      throw new ApiError(400, `หมวดหมู่ไม่ถูกต้อง ต้องเป็นหนึ่งใน: ${VALID_CATEGORIES.join(', ')}`);
    }
    const oversizedPhoto = photoFiles.find((f) => f.size > MAX_PHOTO_SIZE_BYTES);
    if (oversizedPhoto) throw new ApiError(400, 'ไฟล์รูปภาพต้องไม่เกิน 8 MB ต่อรูป');

    let videoPayload = null;
    if (videoFile) {
      const durationSec = await getVideoDurationSeconds(videoFile.path).catch(() => {
        throw new ApiError(400, 'ไม่สามารถอ่านไฟล์วิดีโอได้ กรุณาลองใหม่ด้วยไฟล์ MP4/MOV/WebM');
      });
      if (durationSec > MAX_VIDEO_SECONDS) {
        throw new ApiError(400, `วิดีโอต้องมีความยาวไม่เกิน 1 นาที (ไฟล์นี้ยาว ${Math.round(durationSec)} วินาที)`);
      }

      const posterFilename = `${path.parse(videoFile.filename).name}.jpg`;
      const posterPath = path.join(VIDEO_UPLOAD_DIR, posterFilename);
      await generateVideoPoster(videoFile.path, posterPath).catch(() => null);

      videoPayload = {
        url: `/uploads/videos/${videoFile.filename}`,
        posterUrl: require('fs').existsSync(posterPath) ? `/uploads/videos/${posterFilename}` : null,
        durationSec: Math.round(durationSec),
      };
    }

    const photoUrls = photoFiles.map((f) => `/uploads/${f.filename}`);
    const { author, avatar } = await resolveAuthorInfo(req);

    const doc = await reviewModel.addReview(placeId, {
      uid: req.user.uid, author, avatar, rating, text, category, photos: photoUrls, video: videoPayload?.url || (typeof videoPayload === 'string' ? videoPayload : ''),
    });
    return ok(res, { review: doc }, 201);
  } catch (err) {
    photoFiles.forEach((f) => safeUnlink(f.path));
    if (videoFile) safeUnlink(videoFile.path);
    throw err;
  }
});

function cleanupReviewFiles(review) {
  if (!review) return;
  (review.photos || []).forEach((url) => safeUnlink(path.join(UPLOAD_DIR, path.basename(url))));
  const vUrl = typeof review.video === 'object' ? review.video?.url : review.video;
  const pUrl = typeof review.video === 'object' ? review.video?.posterUrl : null;
  if (vUrl) safeUnlink(path.join(VIDEO_UPLOAD_DIR, path.basename(vUrl)));
  if (pUrl) safeUnlink(path.join(VIDEO_UPLOAD_DIR, path.basename(pUrl)));
}

const deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  let review = await reviewModel.getReviewById(reviewId);
  if (review) {
    if (review.uid !== req.user.uid) throw new ApiError(403, 'ไม่มีสิทธิ์ลบรีวิวนี้');
    await reviewModel.deleteReview(reviewId);
    cleanupReviewFiles(review);
    return ok(res, { message: 'ลบรีวิวสำเร็จ' });
  }
  let checkin = await checkinModel.getPostById(reviewId);
  if (checkin) {
    if (checkin.uid !== req.user.uid) throw new ApiError(403, 'ไม่มีสิทธิ์ลบโพสต์นี้');
    await checkinModel.deletePost(reviewId);
    cleanupReviewFiles(checkin);
    return ok(res, { message: 'ลบโพสต์สำเร็จ' });
  }
  throw new ApiError(404, 'ไม่พบรีวิวหรือโพสต์นี้');
});

const adminDeleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  let review = await reviewModel.getReviewById(reviewId);
  if (review) {
    await reviewModel.deleteReview(reviewId);
    cleanupReviewFiles(review);
    await recordAuditLog(req, {
      action: review.video ? 'video.delete' : 'review.delete',
      targetType: review.video ? 'video' : 'review',
      targetId: reviewId,
      targetLabel: `${review.author} · ${review.placeId || review.place}`,
    });
    return ok(res, { message: 'ลบสำเร็จ (โดยผู้ดูแลระบบ)' });
  }
  let checkin = await checkinModel.getPostById(reviewId);
  if (checkin) {
    await checkinModel.deletePost(reviewId);
    cleanupReviewFiles(checkin);
    await recordAuditLog(req, {
      action: checkin.video ? 'video.delete' : 'checkin.delete',
      targetType: checkin.video ? 'video' : 'checkin',
      targetId: reviewId,
      targetLabel: `${checkin.author} · ${checkin.place}`,
    });
    return ok(res, { message: 'ลบสำเร็จ (โดยผู้ดูแลระบบ)' });
  }
  throw new ApiError(404, 'ไม่พบรีวิวหรือโพสต์นี้');
});

const getVideoFeed = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const targetCategory = category ? normalizeCategory(category) : null;

  const [allReviews, allCheckins] = await Promise.all([
    reviewModel.getVideoReviews().catch(() => []),
    checkinModel.getAllPosts().catch(() => []),
  ]);
  const reviewRows = (allReviews || []).filter((r) => r.video);
  const checkinRows = (allCheckins || []).filter((p) => p.video && p.visibility === 'public');

  const mappedCheckins = checkinRows.map((p) => ({
    id: p.id,
    placeId: p.placeId || '',
    placeName: p.place || '',
    uid: p.uid,
    author: p.author,
    avatar: p.avatar,
    rating: p.rating || 5,
    text: (Array.isArray(p.hashtags) && p.hashtags.length ? p.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ') + ' ' : '') + (p.place || ''),
    category: normalizeCategory(p.category) || 'culture',
    photos: p.photos || [],
    video: p.video,
    likeCount: p.likeCount || 0,
    commentCount: p.commentCount || 0,
    createdAt: p.createdAt,
    source: 'checkin',
  }));

  const mappedReviews = reviewRows.map((r) => ({
    ...r,
    category: normalizeCategory(r.category) || 'culture',
    source: 'review',
  }));

  let combined = [...mappedReviews, ...mappedCheckins];

  if (targetCategory && targetCategory !== 'all') {
    combined = combined.filter((v) => {
      const vCat = normalizeCategory(v.category);
      if (targetCategory === 'restaurant' && (vCat === 'restaurant' || vCat === 'food')) return true;
      return vCat === targetCategory;
    });
  }

  combined.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  let likedIds = new Set();
  if (req.user) {
    const results = await Promise.all(
      combined.map((v) =>
        v.source === 'checkin'
          ? checkinModel.isLikedByUser(req.user.uid, v.id).catch(() => false)
          : reviewModel.isLikedByUser(req.user.uid, v.id).catch(() => false)
      )
    );
    combined.forEach((v, i) => {
      if (results[i]) likedIds.add(v.id);
    });
  }

  const enriched = combined.map((v) => ({ ...v, likedByMe: likedIds.has(v.id) }));
  return ok(res, { videos: enriched });
});

const likeReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const review = await reviewModel.getReviewById(reviewId).catch(() => null);
  if (review) {
    await reviewModel.addLike(req.user.uid, reviewId);
    return ok(res, { reviewId, liked: true }, 201);
  }
  const checkin = await checkinModel.getPostById(reviewId).catch(() => null);
  if (checkin) {
    await checkinModel.addLike(req.user.uid, reviewId);
    return ok(res, { reviewId, liked: true }, 201);
  }
  throw new ApiError(404, 'ไม่พบรีวิวหรือโพสต์นี้');
});

const unlikeReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const review = await reviewModel.getReviewById(reviewId).catch(() => null);
  if (review) {
    await reviewModel.removeLike(req.user.uid, reviewId);
    return ok(res, { reviewId, liked: false });
  }
  const checkin = await checkinModel.getPostById(reviewId).catch(() => null);
  if (checkin) {
    await checkinModel.removeLike(req.user.uid, reviewId);
    return ok(res, { reviewId, liked: false });
  }
  return ok(res, { reviewId, liked: false });
});

const getComments = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  let rows = await reviewModel.getCommentsByReview(reviewId).catch(() => []);
  if (!rows.length) {
    rows = await checkinModel.getCommentsByPost(reviewId).catch(() => []);
  }
  return ok(res, { reviewId, comments: rows });
});

const addComment = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const text = (req.body?.text || '').trim();
  if (!text) throw new ApiError(400, 'กรุณาเขียนความคิดเห็น');
  if (text.length > 300) throw new ApiError(400, 'ความคิดเห็นต้องไม่เกิน 300 ตัวอักษร');

  const { author, avatar } = await resolveAuthorInfo(req);
  const review = await reviewModel.getReviewById(reviewId).catch(() => null);
  if (review) {
    const doc = await reviewModel.addComment(reviewId, { uid: req.user.uid, author, avatar, text });
    return ok(res, { comment: doc }, 201);
  }
  const checkin = await checkinModel.getPostById(reviewId).catch(() => null);
  if (checkin) {
    const doc = await checkinModel.addComment(reviewId, { uid: req.user.uid, author, avatar, text });
    return ok(res, { comment: doc }, 201);
  }
  throw new ApiError(404, 'ไม่พบรีวิวหรือโพสต์นี้');
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  let comment = await reviewModel.getCommentById(commentId).catch(() => null);
  if (comment) {
    if (comment.uid !== req.user.uid) throw new ApiError(403, 'ไม่มีสิทธิ์ลบความคิดเห็นนี้');
    await reviewModel.deleteComment(commentId);
    return ok(res, { message: 'ลบความคิดเห็นสำเร็จ' });
  }
  comment = await checkinModel.getCommentById(commentId).catch(() => null);
  if (comment) {
    if (comment.uid !== req.user.uid) throw new ApiError(403, 'ไม่มีสิทธิ์ลบความคิดเห็นนี้');
    await checkinModel.deleteComment(commentId);
    return ok(res, { message: 'ลบความคิดเห็นสำเร็จ' });
  }
  throw new ApiError(404, 'ไม่พบความคิดเห็นนี้');
});

const adminDeleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  let comment = await reviewModel.getCommentById(commentId).catch(() => null);
  if (comment) {
    await reviewModel.deleteComment(commentId);
    await recordAuditLog(req, { action: 'comment.delete', targetType: 'comment', targetId: commentId, targetLabel: `${comment.author}: ${comment.text}`.slice(0, 80) });
    return ok(res, { message: 'ลบความคิดเห็นสำเร็จ (โดยผู้ดูแลระบบ)' });
  }
  comment = await checkinModel.getCommentById(commentId).catch(() => null);
  if (comment) {
    await checkinModel.deleteComment(commentId);
    await recordAuditLog(req, { action: 'comment.delete', targetType: 'comment', targetId: commentId, targetLabel: `${comment.author}: ${comment.text}`.slice(0, 80) });
    return ok(res, { message: 'ลบความคิดเห็นสำเร็จ (โดยผู้ดูแลระบบ)' });
  }
  throw new ApiError(404, 'ไม่พบความคิดเห็นนี้');
});

module.exports = {
  getReviews,
  addReview,
  deleteReview,
  adminDeleteReview,
  getVideoFeed,
  likeReview,
  unlikeReview,
  getComments,
  addComment,
  deleteComment,
  adminDeleteComment,
};
