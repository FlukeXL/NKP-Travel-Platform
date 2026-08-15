const checkinModel = require('../models/checkin.model');
const userModel = require('../models/user.model');
const { asyncHandler, ok } = require('../utils/helper');
const { ApiError } = require('../middleware/errorHandler');
const { getVideoDurationSeconds, safeUnlink, generateVideoPoster } = require('../utils/video');
const { UPLOAD_DIR, VIDEO_UPLOAD_DIR } = require('../middleware/upload');
const path = require('path');
const fs = require('fs');
const { recordAuditLog } = require('../utils/auditLog');

const MAX_HASHTAGS = 10;
const MAX_PHOTOS = 5;
const MAX_VIDEO_SECONDS = 61;
const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024;

function inferPlaceCategory(placeName, placeId) {
  if (placeId) {
    const id = String(placeId).toLowerCase();
    if (id.includes('cafe') || id.includes('coffee') || id.includes('roastery')) return 'cafe';
    if (id.includes('restaurant') || id.includes('food') || id.includes('nem-nueang') || id.includes('cuisine')) return 'restaurant';
    if (id.includes('temple') || id.includes('that-phanom') || id.includes('wat-')) return 'temple';
    if (id.includes('naga') || id.includes('mutelu') || id.includes('sacred')) return 'mutelu';
    if (id.includes('market') || id.includes('shopping') || id.includes('walking-street') || id.includes('plaza')) return 'shopping';
    if (id.includes('nature') || id.includes('sunset') || id.includes('park') || id.includes('mekong')) return 'nature';
    if (id.includes('fitness') || id.includes('marathon') || id.includes('bike') || id.includes('run')) return 'fitness';
    if (id.includes('culture') || id.includes('museum') || id.includes('heritage') || id.includes('house')) return 'culture';
  }
  if (placeName) {
    const name = String(placeName).toLowerCase();
    if (name.includes('คาเฟ่') || name.includes('กาแฟ') || name.includes('cafe') || name.includes('coffee') || name.includes('ชา')) return 'cafe';
    if (name.includes('ร้านอาหาร') || name.includes('แหนมเนือง') || name.includes('ก๋วยเตี๋ยว') || name.includes('ส้มตำ') || name.includes('ปลาเผา') || name.includes('ของกิน') || name.includes('อาหาร')) return 'restaurant';
    if (name.includes('วัด') || name.includes('พระธาตุ') || name.includes('โบสถ์') || name.includes('เจดีย์')) return 'temple';
    if (name.includes('พญาศรีสัตตนาคราช') || name.includes('พญานาค') || name.includes('สายมู') || name.includes('มูเตลู') || name.includes('ขอพร') || name.includes('สิ่งศักดิ์สิทธิ์')) return 'mutelu';
    if (name.includes('ตลาด') || name.includes('ถนนคนเดิน') || name.includes('ช้อป') || name.includes('ของฝาก') || name.includes('ผ้าคราม')) return 'shopping';
    if (name.includes('ริมโขง') || name.includes('หาด') || name.includes('น้ำตก') || name.includes('อุทยาน') || name.includes('สวน') || name.includes('เกาะ') || name.includes('ธรรมชาติ')) return 'nature';
    if (name.includes('ปั่นจักรยาน') || name.includes('วิ่ง') || name.includes('ออกกำลังกาย') || name.includes('มาราธอน') || name.includes('ฟิตเนส') || name.includes('สปอร์ต')) return 'fitness';
    if (name.includes('พิพิธภัณฑ์') || name.includes('หอสมุด') || name.includes('บ้านลุงโฮ') || name.includes('โบราณ') || name.includes('วัฒนธรรม')) return 'culture';
  }
  return 'culture';
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

const getFeed = asyncHandler(async (req, res) => {
  const uid = req.user?.uid || null;
  const rows = await checkinModel.getFeed(uid);

  let likedIds = new Set();
  if (uid) {
    const results = await Promise.all(rows.map((p) => checkinModel.isLikedByUser(uid, p.id)));
    rows.forEach((p, i) => { if (results[i]) likedIds.add(p.id); });
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
    const category = inferPlaceCategory(place, placeId);

    const doc = await checkinModel.addPost({
      uid: req.user.uid, author, avatar, place, placeId, photos: photoUrls, video: videoPayload, hashtags, rating, visibility, category,
    });
    return ok(res, { post: doc }, 201);
  } catch (err) {
    photoFiles.forEach((f) => safeUnlink(f.path));
    if (videoFile) safeUnlink(videoFile.path);
    throw err;
  }
});

function cleanupPostFiles(post) {
  if (!post) return;
  (post.photos || []).forEach((url) => safeUnlink(path.join(UPLOAD_DIR, path.basename(url))));
  if (post.video?.url) safeUnlink(path.join(VIDEO_UPLOAD_DIR, path.basename(post.video.url)));
  if (post.video?.posterUrl) safeUnlink(path.join(VIDEO_UPLOAD_DIR, path.basename(post.video.posterUrl)));
}

const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const post = await checkinModel.getPostById(postId);
  if (!post) throw new ApiError(404, 'ไม่พบโพสต์นี้');
  if (post.uid !== req.user.uid) throw new ApiError(403, 'ไม่มีสิทธิ์ลบโพสต์นี้');
  await checkinModel.deletePost(postId);
  cleanupPostFiles(post);
  return ok(res, { message: 'ลบโพสต์สำเร็จ' });
});

const adminDeletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const post = await checkinModel.getPostById(postId);
  if (!post) throw new ApiError(404, 'ไม่พบโพสต์นี้');
  await checkinModel.deletePost(postId);
  cleanupPostFiles(post);
  await recordAuditLog(req, { action: 'checkin.delete', targetType: 'checkin', targetId: postId, targetLabel: `${post.author} · ${post.place}` });
  return ok(res, { message: 'ลบโพสต์สำเร็จ (โดยผู้ดูแลระบบ)' });
});

const likePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const post = await checkinModel.getPostById(postId);
  if (!post) throw new ApiError(404, 'ไม่พบโพสต์นี้');
  await checkinModel.addLike(req.user.uid, postId);
  return ok(res, { postId, liked: true }, 201);
});

const unlikePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  await checkinModel.removeLike(req.user.uid, postId);
  return ok(res, { postId, liked: false });
});

const getComments = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const rows = await checkinModel.getCommentsByPost(postId);
  return ok(res, { postId, comments: rows });
});

const addComment = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const text = (req.body?.text || '').trim();
  if (!text) throw new ApiError(400, 'กรุณาเขียนความคิดเห็น');
  if (text.length > 300) throw new ApiError(400, 'ความคิดเห็นต้องไม่เกิน 300 ตัวอักษร');

  const { author, avatar } = await resolveAuthorInfo(req);
  const post = await checkinModel.getPostById(postId);
  if (!post) throw new ApiError(404, 'ไม่พบโพสต์นี้');
  const doc = await checkinModel.addComment(postId, { uid: req.user.uid, author, avatar, text });
  return ok(res, { comment: doc }, 201);
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const comment = await checkinModel.getCommentById(commentId);
  if (!comment) throw new ApiError(404, 'ไม่พบความคิดเห็นนี้');
  if (comment.uid !== req.user.uid) throw new ApiError(403, 'ไม่มีสิทธิ์ลบความคิดเห็นนี้');
  await checkinModel.deleteComment(commentId);
  return ok(res, { message: 'ลบความคิดเห็นสำเร็จ' });
});

const adminDeleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const comment = await checkinModel.getCommentById(commentId);
  if (!comment) throw new ApiError(404, 'ไม่พบความคิดเห็นนี้');
  await checkinModel.deleteComment(commentId);
  await recordAuditLog(req, { action: 'comment.delete', targetType: 'comment', targetId: commentId, targetLabel: `${comment.author}: ${comment.text}`.slice(0, 80) });
  return ok(res, { message: 'ลบความคิดเห็นสำเร็จ (โดยผู้ดูแลระบบ)' });
});

const getMyNotes = asyncHandler(async (req, res) => {
  const rows = await checkinModel.getNotesByUser(req.user.uid);
  return ok(res, { notes: rows });
});

const addNote = asyncHandler(async (req, res) => {
  const place = (req.body?.place || '').trim();
  const title = (req.body?.title || '').trim();
  const body = (req.body?.body || '').trim();
  if (!place || !title || !body) throw new ApiError(400, 'กรุณากรอกสถานที่ ชื่อบันทึก และรายละเอียดให้ครบ');
  if (body.length > 600) throw new ApiError(400, 'รายละเอียดต้องไม่เกิน 600 ตัวอักษร');

  const doc = await checkinModel.addNote(req.user.uid, { place, title, body });
  return ok(res, { note: doc }, 201);
});

const deleteNote = asyncHandler(async (req, res) => {
  const { noteId } = req.params;
  const note = await checkinModel.getNoteById(noteId);
  if (!note) throw new ApiError(404, 'ไม่พบบันทึกนี้');
  if (note.uid !== req.user.uid) throw new ApiError(403, 'ไม่มีสิทธิ์ลบบันทึกนี้');
  await checkinModel.deleteNote(noteId);
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
