const path = require('path');
const { isFirebaseReady } = require('../config/firebase');
const reviewModel = require('../models/review.model');
const checkinModel = require('../models/checkin.model');
const userModel = require('../models/user.model');
const devStore = require('../utils/devStore');
const { asyncHandler, ok } = require('../utils/helper');
const { ApiError } = require('../middleware/errorHandler');
const { getVideoDurationSeconds, safeUnlink, generateVideoPoster } = require('../utils/video');
const { UPLOAD_DIR, VIDEO_UPLOAD_DIR } = require('../middleware/upload');
const { recordAuditLog } = require('../utils/auditLog');

const DEV_REVIEWS = 'reviews';
const DEV_LIKES = 'review_likes';
const DEV_COMMENTS = 'review_comments';

const MAX_VIDEO_SECONDS = 61;
const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB per photo — video gets its own much larger multer limit, so photos need their own explicit check here
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

function devReviewsForPlace(placeId) {
  const all = devStore.readAll(DEV_REVIEWS);
  return Object.values(all)
    .filter((r) => r.placeId === placeId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function resolveAuthorInfo(req) {
  let author = req.user.email;
  let avatar = null;
  if (isFirebaseReady()) {
    const profile = await userModel.getUserById(req.user.uid);
    author = profile?.name || author;
    avatar = profile?.avatar || null;
  } else {
    const record = devStore.get('auth_users', req.user.uid);
    author = record?.name || author;
    avatar = record?.avatar || null;
  }
  return { author, avatar };
}

const getReviews = asyncHandler(async (req, res) => {
  const { placeId } = req.params;
  const rows = isFirebaseReady() ? await reviewModel.getReviewsByPlace(placeId) : devReviewsForPlace(placeId);
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
      await generateVideoPoster(videoFile.path, posterPath).catch(() => null); // poster is a nice-to-have, don't fail the whole review if it can't be generated

      videoPayload = {
        url: `/uploads/videos/${videoFile.filename}`,
        posterUrl: require('fs').existsSync(posterPath) ? `/uploads/videos/${posterFilename}` : null,
        durationSec: Math.round(durationSec),
      };
    }

    const photoUrls = photoFiles.map((f) => `/uploads/${f.filename}`);
    const { author, avatar } = await resolveAuthorInfo(req);

    if (isFirebaseReady()) {
      const doc = await reviewModel.addReview(placeId, {
        uid: req.user.uid, author, avatar, rating, text, category, photos: photoUrls, video: videoPayload,
      });
      return ok(res, { review: doc }, 201);
    }

    const id = `${placeId}_${Date.now()}`;
    const doc = {
      id, placeId, uid: req.user.uid, author, avatar, rating, text, category,
      photos: photoUrls, video: videoPayload, likeCount: 0, commentCount: 0, createdAt: new Date().toISOString(),
    };
    devStore.set(DEV_REVIEWS, id, doc);
    return ok(res, { review: doc }, 201);
  } catch (err) {
    photoFiles.forEach((f) => safeUnlink(f.path));
    if (videoFile) safeUnlink(videoFile.path);
    throw err;
  }
});

const deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;

  if (isFirebaseReady()) {
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
  }

  let review = devStore.get(DEV_REVIEWS, reviewId);
  if (review) {
    if (review.uid !== req.user.uid) throw new ApiError(403, 'ไม่มีสิทธิ์ลบรีวิวนี้');
    devStore.remove(DEV_REVIEWS, reviewId);
    cleanupReviewFiles(review);
    return ok(res, { message: 'ลบรีวิวสำเร็จ' });
  }

  let checkin = devStore.get('checkin_posts', reviewId);
  if (checkin) {
    if (checkin.uid !== req.user.uid) throw new ApiError(403, 'ไม่มีสิทธิ์ลบโพสต์นี้');
    devStore.remove('checkin_posts', reviewId);
    cleanupReviewFiles(checkin);
    return ok(res, { message: 'ลบโพสต์สำเร็จ' });
  }

  throw new ApiError(404, 'ไม่พบรีวิวหรือโพสต์นี้');
});

const adminDeleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;

  if (isFirebaseReady()) {
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
  }

  let review = devStore.get(DEV_REVIEWS, reviewId);
  if (review) {
    devStore.remove(DEV_REVIEWS, reviewId);
    cleanupReviewFiles(review);
    await recordAuditLog(req, {
      action: review.video ? 'video.delete' : 'review.delete',
      targetType: review.video ? 'video' : 'review',
      targetId: reviewId,
      targetLabel: `${review.author} · ${review.placeId}`,
    });
    return ok(res, { message: 'ลบสำเร็จ (โดยผู้ดูแลระบบ)' });
  }

  let checkin = devStore.get('checkin_posts', reviewId);
  if (checkin) {
    devStore.remove('checkin_posts', reviewId);
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

function cleanupReviewFiles(review) {
  (review.photos || []).forEach((url) => safeUnlink(path.join(UPLOAD_DIR, path.basename(url))));
  if (review.video?.url) safeUnlink(path.join(VIDEO_UPLOAD_DIR, path.basename(review.video.url)));
  if (review.video?.posterUrl) safeUnlink(path.join(VIDEO_UPLOAD_DIR, path.basename(review.video.posterUrl)));
}

const getVideoFeed = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const targetCategory = category ? normalizeCategory(category) : null;

  let reviewRows = [];
  let checkinRows = [];

  if (isFirebaseReady()) {
    try {
      const [allReviews, allCheckins] = await Promise.all([
        reviewModel.getVideoReviews().catch(() => []),
        checkinModel.getAllPosts().catch(() => []),
      ]);
      reviewRows = (allReviews || []).filter((r) => r.video);
      checkinRows = (allCheckins || []).filter((p) => p.video && p.visibility === 'public');
    } catch (err) {
      console.warn('[getVideoFeed] Firebase read error:', err.message);
    }
    const devRev = Object.values(devStore.readAll(DEV_REVIEWS)).filter((r) => r.video);
    const devCheck = Object.values(devStore.readAll('checkin_posts')).filter((p) => p.video && p.visibility === 'public');
    const existingIds = new Set([...reviewRows.map((r) => r.id), ...checkinRows.map((p) => p.id)]);
    devRev.forEach((r) => { if (!existingIds.has(r.id)) reviewRows.push(r); });
    devCheck.forEach((p) => { if (!existingIds.has(p.id)) checkinRows.push(p); });
  } else {
    reviewRows = Object.values(devStore.readAll(DEV_REVIEWS)).filter((r) => r.video);
    checkinRows = Object.values(devStore.readAll('checkin_posts')).filter((p) => p.video && p.visibility === 'public');
  }

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

  combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  let likedIds = new Set();
  if (req.user) {
    if (isFirebaseReady()) {
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
    } else {
      const reviewLikes = devStore.readAll(DEV_LIKES);
      const checkinLikes = devStore.readAll('checkin_likes');
      const rLiked = Object.values(reviewLikes).filter((l) => l.uid === req.user.uid).map((l) => l.reviewId);
      const cLiked = Object.values(checkinLikes).filter((l) => l.uid === req.user.uid).map((l) => l.postId);
      likedIds = new Set([...rLiked, ...cLiked]);
    }
  }

  const enriched = combined.map((v) => ({ ...v, likedByMe: likedIds.has(v.id) }));
  return ok(res, { videos: enriched });
});

/* ----------------------------------------------------------
   Likes
---------------------------------------------------------- */
const likeReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;

  if (isFirebaseReady()) {
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
  }

  const review = devStore.get(DEV_REVIEWS, reviewId);
  if (review) {
    const likeId = `${req.user.uid}_${reviewId}`;
    if (!devStore.get(DEV_LIKES, likeId)) {
      devStore.set(DEV_LIKES, likeId, { uid: req.user.uid, reviewId, createdAt: new Date().toISOString() });
      review.likeCount = (review.likeCount || 0) + 1;
      devStore.set(DEV_REVIEWS, reviewId, review);
    }
    return ok(res, { reviewId, liked: true }, 201);
  }

  const checkin = devStore.get('checkin_posts', reviewId);
  if (checkin) {
    const likeId = `${req.user.uid}_${reviewId}`;
    if (!devStore.get('checkin_likes', likeId)) {
      devStore.set('checkin_likes', likeId, { uid: req.user.uid, postId: reviewId, createdAt: new Date().toISOString() });
      checkin.likeCount = (checkin.likeCount || 0) + 1;
      devStore.set('checkin_posts', reviewId, checkin);
    }
    return ok(res, { reviewId, liked: true }, 201);
  }

  throw new ApiError(404, 'ไม่พบรีวิวหรือโพสต์นี้');
});

const unlikeReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;

  if (isFirebaseReady()) {
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
  }

  const review = devStore.get(DEV_REVIEWS, reviewId);
  const likeId = `${req.user.uid}_${reviewId}`;
  if (devStore.get(DEV_LIKES, likeId)) {
    devStore.remove(DEV_LIKES, likeId);
    if (review) {
      review.likeCount = Math.max(0, (review.likeCount || 0) - 1);
      devStore.set(DEV_REVIEWS, reviewId, review);
    }
  }

  const checkin = devStore.get('checkin_posts', reviewId);
  if (devStore.get('checkin_likes', likeId)) {
    devStore.remove('checkin_likes', likeId);
    if (checkin) {
      checkin.likeCount = Math.max(0, (checkin.likeCount || 0) - 1);
      devStore.set('checkin_posts', reviewId, checkin);
    }
  }

  return ok(res, { reviewId, liked: false });
});

/* ----------------------------------------------------------
   Comments
---------------------------------------------------------- */
const getComments = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  let rows = [];
  if (isFirebaseReady()) {
    rows = await reviewModel.getCommentsByReview(reviewId).catch(() => []);
    if (!rows.length) {
      rows = await checkinModel.getCommentsByPost(reviewId).catch(() => []);
    }
  }

  if (!rows.length) {
    const rComments = Object.values(devStore.readAll(DEV_COMMENTS)).filter((c) => c.reviewId === reviewId);
    const cComments = Object.values(devStore.readAll('checkin_comments')).filter((c) => c.postId === reviewId);
    rows = [...rComments, ...cComments].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }
  return ok(res, { reviewId, comments: rows });
});

const addComment = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const text = (req.body?.text || '').trim();
  if (!text) throw new ApiError(400, 'กรุณาเขียนความคิดเห็น');
  if (text.length > 300) throw new ApiError(400, 'ความคิดเห็นต้องไม่เกิน 300 ตัวอักษร');

  const { author, avatar } = await resolveAuthorInfo(req);

  if (isFirebaseReady()) {
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
  }

  const review = devStore.get(DEV_REVIEWS, reviewId);
  if (review) {
    const id = `${reviewId}_${Date.now()}`;
    const doc = { id, reviewId, uid: req.user.uid, author, avatar, text, createdAt: new Date().toISOString() };
    devStore.set(DEV_COMMENTS, id, doc);
    review.commentCount = (review.commentCount || 0) + 1;
    devStore.set(DEV_REVIEWS, reviewId, review);
    return ok(res, { comment: doc }, 201);
  }

  const checkin = devStore.get('checkin_posts', reviewId);
  if (checkin) {
    const id = `comm_${Date.now()}`;
    const doc = { id, postId: reviewId, uid: req.user.uid, author, avatar, text, createdAt: new Date().toISOString() };
    devStore.set('checkin_comments', id, doc);
    checkin.commentCount = (checkin.commentCount || 0) + 1;
    devStore.set('checkin_posts', reviewId, checkin);
    return ok(res, { comment: doc }, 201);
  }

  throw new ApiError(404, 'ไม่พบรีวิวหรือโพสต์นี้');
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (isFirebaseReady()) {
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
  }

  let comment = devStore.get(DEV_COMMENTS, commentId);
  if (comment) {
    if (comment.uid !== req.user.uid) throw new ApiError(403, 'ไม่มีสิทธิ์ลบความคิดเห็นนี้');
    devStore.remove(DEV_COMMENTS, commentId);
    const review = devStore.get(DEV_REVIEWS, comment.reviewId);
    if (review) {
      review.commentCount = Math.max(0, (review.commentCount || 0) - 1);
      devStore.set(DEV_REVIEWS, comment.reviewId, review);
    }
    return ok(res, { message: 'ลบความคิดเห็นสำเร็จ' });
  }

  comment = devStore.get('checkin_comments', commentId);
  if (comment) {
    if (comment.uid !== req.user.uid) throw new ApiError(403, 'ไม่มีสิทธิ์ลบความคิดเห็นนี้');
    devStore.remove('checkin_comments', commentId);
    const post = devStore.get('checkin_posts', comment.postId);
    if (post) {
      post.commentCount = Math.max(0, (post.commentCount || 0) - 1);
      devStore.set('checkin_posts', comment.postId, post);
    }
    return ok(res, { message: 'ลบความคิดเห็นสำเร็จ' });
  }

  throw new ApiError(404, 'ไม่พบความคิดเห็นนี้');
});

const adminDeleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (isFirebaseReady()) {
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
  }

  let comment = devStore.get(DEV_COMMENTS, commentId);
  if (comment) {
    devStore.remove(DEV_COMMENTS, commentId);
    const review = devStore.get(DEV_REVIEWS, comment.reviewId);
    if (review) {
      review.commentCount = Math.max(0, (review.commentCount || 0) - 1);
      devStore.set(DEV_REVIEWS, comment.reviewId, review);
    }
    await recordAuditLog(req, { action: 'comment.delete', targetType: 'comment', targetId: commentId, targetLabel: `${comment.author}: ${comment.text}`.slice(0, 80) });
    return ok(res, { message: 'ลบความคิดเห็นสำเร็จ (โดยผู้ดูแลระบบ)' });
  }

  comment = devStore.get('checkin_comments', commentId);
  if (comment) {
    devStore.remove('checkin_comments', commentId);
    const post = devStore.get('checkin_posts', comment.postId);
    if (post) {
      post.commentCount = Math.max(0, (post.commentCount || 0) - 1);
      devStore.set('checkin_posts', comment.postId, post);
    }
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
