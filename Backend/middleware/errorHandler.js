const env = require('../config/env');

class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) {
  if (err.name === 'MulterError') {
    const messages = {
      LIMIT_FILE_SIZE: 'ไฟล์มีขนาดใหญ่เกินไป (ไฟล์รูปภาพต้องไม่เกิน 8 MB ต่อรูป)',
      LIMIT_FILE_COUNT: 'อัปโหลดไฟล์เกินจำนวนที่กำหนด',
      LIMIT_UNEXPECTED_FILE: 'ไม่รองรับไฟล์ประเภทนี้ในช่องนี้',
    };
    return res.status(400).json({ success: false, error: messages[err.code] || err.message });
  }

  const statusCode = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const payload = {
    success: false,
    error: err.message || 'Internal Server Error',
  };
  if (err.details) payload.details = err.details;
  if (env.NODE_ENV !== 'production' && statusCode === 500) payload.stack = err.stack;

  if (statusCode >= 500) console.error('[error]', err);
  res.status(statusCode).json(payload);
}

module.exports = { ApiError, notFoundHandler, errorHandler };
