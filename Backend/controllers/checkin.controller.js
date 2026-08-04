const { isFirebaseReady } = require('../config/firebase');
const checkinModel = require('../models/checkin.model');
const userModel = require('../models/user.model');
const devStore = require('../utils/devStore');
const { asyncHandler, ok } = require('../utils/helper');
const { ApiError } = require('../middleware/errorHandler');
const { getVideoDurationSeconds, safeUnlink, generateVideoPoster } = require('../utils/video');
const { UPLOAD_DIR, VIDEO_UPLOAD_DIR } = require('../middleware/upload');
const path = require('path');
const fs = require('fs');
const { recordAuditLog } = require('../utils/auditLog');

const DEV_POSTS = 'checkin_posts';
const DEV_LIKES = 'checkin_likes';
const DEV_COMMENTS = 'checkin_comments';
const DEV_NOTES = 'checkin_notes';

const MAX_HASHTAGS = 10;
const MAX_PHOTOS = 5;
const MAX_VIDEO_SECONDS = 61;
const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB per photo

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

function devFeedFor(uid) {
  const all = Object.values(devStore.readAll(DEV_POSTS));
  const visible = all.filter((p) => p.visibility === 'public' || (uid && p.uid === uid));
  return visible.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

const getFeed = asyncHandler(async (req, res) => {
  const uid = req.user?.uid || null;
  const rows = isFirebaseReady() ? await checkinModel.getFeed(uid) : devFeedFor(uid);

  let likedIds = new Set();
  if (uid) {
    if (isFirebaseReady()) {
      const results = await Promise.all(rows.map((p) => checkinModel.isLikedByUser(uid, p.id)));
      rows.forEach((p, i) => { if (results[i]) likedIds.add(p.id); });
    } else {
      const allLikes = devStore.readAll(DEV_LIKES);
      likedIds = new Set(Object.values(allLikes).filter((l) => l.uid === uid).map((l) => l.postId));
    }
  }

  const enriched = rows.map((p) => ({ ...p, likedByMe: likedIds.has(p.id) }));
  return ok(res, { posts: enriched });
});

const addPost = asyncHandler(async (req, res) => {
  const place = (req.body?.place || '').trim();
  const placeId = req.body?.placeId || null;
  const rating = req.body?.rating ? Number(req.body.rating) : null;
  const visibility = req.body?.visibility === 'private' ? 'private' : 'public';
  let hashtags = [];
  try {
    hashtags = JSON.parse(req.body?.hashtags || '[]');
  } catch {
    hashtags = [];
  }
  if (!Array.isArray(hashtags)) hashtags = [];
  hashtags = hashtags.filter((h) => typeof h === 'string' && h.trim()).slice(0, MAX_HASHTAGS);

  const photoFiles = req.files?.photos || [];
  const videoFile = req.files?.video?.[0] || null;

  try {
    if (!place) throw new ApiError(400, 'กรุณาระบุชื่อสถานที่');
    if (!photoFiles.length && !videoFile) {
      throw new ApiError(400, 'กรุณาอัปโหลดรูปภาพหรือวิดีโออย่างน้อย 1 รายการ');
    }
    if (photoFiles.length > MAX_PHOTOS) {
      throw new ApiError(400, `อัปโหลดรูปได้สูงสุด ${MAX_PHOTOS} รูป`);
    }
    const oversizedPhoto = photoFiles.find((f) => f.size > MAX_PHOTO_SIZE_BYTES);
    if (oversizedPhoto) {
      throw new ApiError(400, 'ไฟล์รูปภาพต้องไม่เกิน 8 MB ต่อรูป');
    }
    if (rating !== null && (!Number.isInteger(rating) || rating < 0 || rating > 5)) {
      throw new ApiError(400, 'คะแนนต้องเป็นตัวเลข 0-5 ดาว');
    }

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
        posterUrl: fs.existsSync(posterPath) ? `/uploads/videos/${posterFilename}` : null,
        durationSec: Math.round(durationSec),
      };
    }

    const photoUrls = photoFiles.map((f) => `/uploads/${f.filename}`);
    const { author, avatar } = await resolveAuthorInfo(req);

    if (isFirebaseReady()) {
      const doc = await checkinModel.addPost({
        uid: req.user.uid, author, avatar, place, placeId, photos: photoUrls, video: videoPayload, hashtags, rating, visibility,
      });
      return ok(res, { post: doc }, 201);
    }

    const id = `ci_${Date.now()}`;
    const doc = {
      id, uid: req.user.uid, author, avatar, place, placeId, photos: photoUrls, video: videoPayload, hashtags,
      rating, visibility, likeCount: 0, commentCount: 0, createdAt: new Date().toISOString(),
    };
    devStore.set(DEV_POSTS, id, doc);
    return ok(res, { post: doc }, 201);
  } catch (err) {
    photoFiles.forEach((f) => safeUnlink(f.path));
    if (videoFile) safeUnlink(videoFile.path);
    throw err;
  }
});

function cleanupPostFiles(post) {
  (post.photos || []).forEach((url) => safeUnlink(path.join(UPLOAD_DIR, path.basename(url))));
  if (post.video?.url) safeUnlink(path.join(VIDEO_UPLOAD_DIR, path.basename(post.video.url)));
  if (post.video?.posterUrl) safeUnlink(path.join(VIDEO_UPLOAD_DIR, path.basename(post.video.posterUrl)));
}

const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (isFirebaseReady()) {
    const post = await checkinModel.getPostById(postId);
    if (!post) throw new ApiError(404, 'ไม่พบโพสต์นี้');
    if (post.uid !== req.user.uid) throw new ApiError(403, 'ไม่มีสิทธิ์ลบโพสต์นี้');
    await checkinModel.deletePost(postId);
    cleanupPostFiles(post);
    return ok(res, { message: 'ลบโพสต์สำเร็จ' });
  }

  const post = devStore.get(DEV_POSTS, postId);
  if (!post) throw new ApiError(404, 'ไม่พบโพสต์นี้');
  if (post.uid !== req.user.uid) throw new ApiError(403, 'ไม่มีสิทธิ์ลบโพสต์นี้');
  devStore.remove(DEV_POSTS, postId);
  cleanupPostFiles(post);
  return ok(res, { message: 'ลบโพสต์สำเร็จ' });
});

const adminDeletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (isFirebaseReady()) {
    const post = await checkinModel.getPostById(postId);
    if (!post) throw new ApiError(404, 'ไม่พบโพสต์นี้');
    await checkinModel.deletePost(postId);
    cleanupPostFiles(post);
    await recordAuditLog(req, { action: 'checkin.delete', targetType: 'checkin', targetId: postId, targetLabel: `${post.author} · ${post.place}` });
    return ok(res, { message: 'ลบโพสต์สำเร็จ (โดยผู้ดูแลระบบ)' });
  }

  const post = devStore.get(DEV_POSTS, postId);
  if (!post) throw new ApiError(404, 'ไม่พบโพสต์นี้');
  devStore.remove(DEV_POSTS, postId);
  cleanupPostFiles(post);
  await recordAuditLog(req, { action: 'checkin.delete', targetType: 'checkin', targetId: postId, targetLabel: `${post.author} · ${post.place}` });
  return ok(res, { message: 'ลบโพสต์สำเร็จ (โดยผู้ดูแลระบบ)' });
});

/* ----------------------------------------------------------
   Likes
---------------------------------------------------------- */
const likePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (isFirebaseReady()) {
    const post = await checkinModel.getPostById(postId);
    if (!post) throw new ApiError(404, 'ไม่พบโพสต์นี้');
    await checkinModel.addLike(req.user.uid, postId);
    return ok(res, { postId, liked: true }, 201);
  }

  const post = devStore.get(DEV_POSTS, postId);
  if (!post) throw new ApiError(404, 'ไม่พบโพสต์นี้');
  const likeId = `${req.user.uid}_${postId}`;
  if (!devStore.get(DEV_LIKES, likeId)) {
    devStore.set(DEV_LIKES, likeId, { uid: req.user.uid, postId, createdAt: new Date().toISOString() });
    post.likeCount = (post.likeCount || 0) + 1;
    devStore.set(DEV_POSTS, postId, post);
  }
  return ok(res, { postId, liked: true }, 201);
});

const unlikePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (isFirebaseReady()) {
    await checkinModel.removeLike(req.user.uid, postId);
    return ok(res, { postId, liked: false });
  }

  const post = devStore.get(DEV_POSTS, postId);
  const likeId = `${req.user.uid}_${postId}`;
  if (devStore.get(DEV_LIKES, likeId)) {
    devStore.remove(DEV_LIKES, likeId);
    if (post) {
      post.likeCount = Math.max(0, (post.likeCount || 0) - 1);
      devStore.set(DEV_POSTS, postId, post);
    }
  }
  return ok(res, { postId, liked: false });
});

/* ----------------------------------------------------------
   Comments
---------------------------------------------------------- */
const getComments = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const rows = isFirebaseReady()
    ? await checkinModel.getCommentsByPost(postId)
    : Object.values(devStore.readAll(DEV_COMMENTS)).filter((c) => c.postId === postId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return ok(res, { postId, comments: rows });
});

const addComment = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const text = (req.body?.text || '').trim();
  if (!text) throw new ApiError(400, 'กรุณาเขียนความคิดเห็น');
  if (text.length > 300) throw new ApiError(400, 'ความคิดเห็นต้องไม่เกิน 300 ตัวอักษร');

  const { author, avatar } = await resolveAuthorInfo(req);

  if (isFirebaseReady()) {
    const post = await checkinModel.getPostById(postId);
    if (!post) throw new ApiError(404, 'ไม่พบโพสต์นี้');
    const doc = await checkinModel.addComment(postId, { uid: req.user.uid, author, avatar, text });
    return ok(res, { comment: doc }, 201);
  }

  const post = devStore.get(DEV_POSTS, postId);
  if (!post) throw new ApiError(404, 'ไม่พบโพสต์นี้');
  const id = `${postId}_${Date.now()}`;
  const doc = { id, postId, uid: req.user.uid, author, avatar, text, createdAt: new Date().toISOString() };
  devStore.set(DEV_COMMENTS, id, doc);
  post.commentCount = (post.commentCount || 0) + 1;
  devStore.set(DEV_POSTS, postId, post);
  return ok(res, { comment: doc }, 201);
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (isFirebaseReady()) {
    const comment = await checkinModel.getCommentById(commentId);
    if (!comment) throw new ApiError(404, 'ไม่พบความคิดเห็นนี้');
    if (comment.uid !== req.user.uid) throw new ApiError(403, 'ไม่มีสิทธิ์ลบความคิดเห็นนี้');
    await checkinModel.deleteComment(commentId);
    return ok(res, { message: 'ลบความคิดเห็นสำเร็จ' });
  }

  const comment = devStore.get(DEV_COMMENTS, commentId);
  if (!comment) throw new ApiError(404, 'ไม่พบความคิดเห็นนี้');
  if (comment.uid !== req.user.uid) throw new ApiError(403, 'ไม่มีสิทธิ์ลบความคิดเห็นนี้');
  devStore.remove(DEV_COMMENTS, commentId);
  const post = devStore.get(DEV_POSTS, comment.postId);
  if (post) {
    post.commentCount = Math.max(0, (post.commentCount || 0) - 1);
    devStore.set(DEV_POSTS, comment.postId, post);
  }
  return ok(res, { message: 'ลบความคิดเห็นสำเร็จ' });
});

const adminDeleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (isFirebaseReady()) {
    const comment = await checkinModel.getCommentById(commentId);
    if (!comment) throw new ApiError(404, 'ไม่พบความคิดเห็นนี้');
    await checkinModel.deleteComment(commentId);
    await recordAuditLog(req, { action: 'comment.delete', targetType: 'comment', targetId: commentId, targetLabel: `${comment.author}: ${comment.text}`.slice(0, 80) });
    return ok(res, { message: 'ลบความคิดเห็นสำเร็จ (โดยผู้ดูแลระบบ)' });
  }

  const comment = devStore.get(DEV_COMMENTS, commentId);
  if (!comment) throw new ApiError(404, 'ไม่พบความคิดเห็นนี้');
  devStore.remove(DEV_COMMENTS, commentId);
  const post = devStore.get(DEV_POSTS, comment.postId);
  if (post) {
    post.commentCount = Math.max(0, (post.commentCount || 0) - 1);
    devStore.set(DEV_POSTS, comment.postId, post);
  }
  await recordAuditLog(req, { action: 'comment.delete', targetType: 'comment', targetId: commentId, targetLabel: `${comment.author}: ${comment.text}`.slice(0, 80) });
  return ok(res, { message: 'ลบความคิดเห็นสำเร็จ (โดยผู้ดูแลระบบ)' });
});

/* ----------------------------------------------------------
   Private notes — visible ONLY to the owner, never public.
---------------------------------------------------------- */
const getMyNotes = asyncHandler(async (req, res) => {
  const rows = isFirebaseReady()
    ? await checkinModel.getNotesByUser(req.user.uid)
    : Object.values(devStore.readAll(DEV_NOTES)).filter((n) => n.uid === req.user.uid).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return ok(res, { notes: rows });
});

const addNote = asyncHandler(async (req, res) => {
  const place = (req.body?.place || '').trim();
  const title = (req.body?.title || '').trim();
  const body = (req.body?.body || '').trim();
  if (!place || !title || !body) throw new ApiError(400, 'กรุณากรอกสถานที่ ชื่อบันทึก และรายละเอียดให้ครบ');
  if (body.length > 600) throw new ApiError(400, 'รายละเอียดต้องไม่เกิน 600 ตัวอักษร');

  if (isFirebaseReady()) {
    const doc = await checkinModel.addNote(req.user.uid, { place, title, body });
    return ok(res, { note: doc }, 201);
  }

  const id = `note_${Date.now()}`;
  const doc = { id, uid: req.user.uid, place, title, body, createdAt: new Date().toISOString() };
  devStore.set(DEV_NOTES, id, doc);
  return ok(res, { note: doc }, 201);
});

const deleteNote = asyncHandler(async (req, res) => {
  const { noteId } = req.params;

  if (isFirebaseReady()) {
    const note = await checkinModel.getNoteById(noteId);
    if (!note) throw new ApiError(404, 'ไม่พบบันทึกนี้');
    if (note.uid !== req.user.uid) throw new ApiError(403, 'ไม่มีสิทธิ์ลบบันทึกนี้');
    await checkinModel.deleteNote(noteId);
    return ok(res, { message: 'ลบบันทึกสำเร็จ' });
  }

  const note = devStore.get(DEV_NOTES, noteId);
  if (!note) throw new ApiError(404, 'ไม่พบบันทึกนี้');
  if (note.uid !== req.user.uid) throw new ApiError(403, 'ไม่มีสิทธิ์ลบบันทึกนี้');
  devStore.remove(DEV_NOTES, noteId);
  return ok(res, { message: 'ลบบันทึกสำเร็จ' });
});

module.exports = {
  getFeed,
  addPost,
  deletePost,
  adminDeletePost,
  likePost,
  unlikePost,
  getComments,
  addComment,
  deleteComment,
  adminDeleteComment,
  getMyNotes,
  addNote,
  deleteNote,
};
