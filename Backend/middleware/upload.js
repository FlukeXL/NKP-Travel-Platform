const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ApiError } = require('./errorHandler');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

function fileFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.mimetype)) {
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
    const allowedExts = isVideo ? ['.mp4', '.mov', '.webm'] : ['.jpg', '.jpeg', '.png', '.webp'];
    const safeExt = allowedExts.includes(ext) ? ext : (isVideo ? '.mp4' : '.jpg');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

function reviewFileFilter(req, file, cb) {
  if (file.fieldname === 'video') {
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new ApiError(400, 'อนุญาตเฉพาะไฟล์วิดีโอ MP4, MOV, หรือ WebM เท่านั้น'));
    }
    return cb(null, true);
  }
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.mimetype)) {
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
