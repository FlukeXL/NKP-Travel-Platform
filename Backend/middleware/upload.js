const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ApiError } = require('./errorHandler');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_VIDEO_EXTS = ['.mp4', '.mov', '.webm', '.m4v', '.3gp', '.mkv'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_IMAGE_EXTS.includes(ext) ? ext : '.jpg';
    const randomHex = Math.random().toString(36).substring(2, 12);
    cb(null, `${Date.now()}-${randomHex}${safeExt}`);
  },
});

function fileFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(file.mimetype) || !ALLOWED_IMAGE_EXTS.includes(ext)) {
    return cb(new ApiError(400, 'อนุญาตเฉพาะไฟล์รูปภาพ JPEG, PNG, หรือ WebP เท่านั้น'));
  }
  cb(null, true);
}

const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB per photo (place gallery photos + check-in photos)

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_PHOTO_SIZE_BYTES, files: 10 },
});

const VIDEO_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'videos');
if (!fs.existsSync(VIDEO_UPLOAD_DIR)) fs.mkdirSync(VIDEO_UPLOAD_DIR, { recursive: true });

const reviewStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, file.fieldname === 'video' ? VIDEO_UPLOAD_DIR : UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isVideo = file.fieldname === 'video';
    const allowedExts = isVideo ? ALLOWED_VIDEO_EXTS : ALLOWED_IMAGE_EXTS;
    const safeExt = allowedExts.includes(ext) ? ext : (isVideo ? '.mp4' : '.jpg');
    const randomHex = Math.random().toString(36).substring(2, 12);
    cb(null, `${Date.now()}-${randomHex}${safeExt}`);
  },
});

function reviewFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.fieldname === 'video') {
    const isVideoMime = file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream';
    const isVideoExt = ALLOWED_VIDEO_EXTS.includes(ext);
    if (!isVideoMime && !isVideoExt) {
      return cb(new ApiError(400, 'อนุญาตเฉพาะไฟล์วิดีโอ (MP4, MOV, WebM ฯลฯ) เท่านั้น'));
    }
    return cb(null, true);
  }
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.mimetype) || !ALLOWED_IMAGE_EXTS.includes(ext)) {
    return cb(new ApiError(400, 'อนุญาตเฉพาะไฟล์รูปภาพ JPEG, PNG, หรือ WebP เท่านั้น'));
  }
  cb(null, true);
}

const uploadReview = multer({
  storage: reviewStorage,
  fileFilter: reviewFileFilter,
  limits: { fileSize: 80 * 1024 * 1024, files: 6 },
});

module.exports = upload;
module.exports.uploadReview = uploadReview;
module.exports.UPLOAD_DIR = UPLOAD_DIR;
module.exports.VIDEO_UPLOAD_DIR = VIDEO_UPLOAD_DIR;
