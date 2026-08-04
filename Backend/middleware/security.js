const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * Configure Helmet with appropriate policies for cross-origin assets
 * (allows Frontend on port 8000/LAN to load uploaded photos/videos seamlessly).
 */
const helmetMiddleware = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  contentSecurityPolicy: false, // Handled per-page or via proxy
  frameguard: { action: 'sameorigin' },
  hidePoweredBy: true,
  ieNoOpen: true,
  noSniff: true,
  xssFilter: true,
});

/**
 * Standard JSON response generator for Rate Limit violations
 */
function createRateLimiter(windowMs, max, message) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    statusCode: 429,
    message: {
      success: false,
      error: message || 'คุณส่งคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง (Rate limit exceeded)',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    },
  });
}

// 1. Global API rate limit: 1000 requests per 15 minutes per IP
const globalLimiter = createRateLimiter(
  15 * 60 * 1000,
  1000,
  'คำขอใช้งาน API ถี่เกินไป กรุณารอ 15 นาทีแล้วลองใหม่'
);

// 2. Strict Auth rate limit: 50 login/register attempts per 15 minutes per IP (Anti Brute-Force)
const authLimiter = createRateLimiter(
  15 * 60 * 1000,
  50,
  'มีการพยายามเข้าสู่ระบบหรือสมัครสมาชิกบ่อยเกินไป เพื่อความปลอดภัยกรุณารอ 15 นาที'
);

// 3. AI Tour Guide chat rate limit: 30 messages per 15 minutes per IP (Anti AI Spam)
const aiLimiter = createRateLimiter(
  15 * 60 * 1000,
  30,
  'ใช้งานระบบ AI ไกด์เกินจำนวนที่กำหนดชั่วคราว กรุณารอสักครู่แล้วลองใหม่'
);

// 4. File Upload rate limit: 30 upload actions per 15 minutes per IP (Anti Storage Flooding)
const uploadLimiter = createRateLimiter(
  15 * 60 * 1000,
  30,
  'อัปโหลดไฟล์บ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่'
);

/**
 * Dangerous script and XSS patterns to remove from input values
 */
const XSS_TAG_REGEX = /<\/?(?:script|iframe|object|embed|applet|meta|link|style|base|form|input|button|textarea|select|svg|xml)[\s\S]*?>/gi;
const DANGEROUS_ATTRIBUTES_REGEX = /\b(on\w+|javascript:|data:\s*text\/html|vbscript:)\s*=/gi;
const JAVASCRIPT_URI_REGEX = /javascript\s*:/gi;

/**
 * Recursively sanitizes strings in an object or array to neutralize XSS payloads
 */
function sanitizeValue(val) {
  if (typeof val === 'string') {
    return val
      .replace(XSS_TAG_REGEX, '')
      .replace(DANGEROUS_ATTRIBUTES_REGEX, '')
      .replace(JAVASCRIPT_URI_REGEX, '')
      .trim();
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (val !== null && typeof val === 'object' && !(val instanceof Buffer)) {
    const cleaned = {};
    for (const [key, v] of Object.entries(val)) {
      // Prevent prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      cleaned[key] = sanitizeValue(v);
    }
    return cleaned;
  }
  return val;
}

/**
 * Express Middleware: Deep sanitize req.body, req.query, and req.params against XSS
 */
function sanitizeInputs(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }
  next();
}

/**
 * Security headers for static upload directories
 */
function staticUploadHeaders(res, path, stat) {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Content-Security-Policy', "default-src 'none'; media-src 'self'; img-src 'self' data:; style-src 'none'; script-src 'none'");
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
}

module.exports = {
  helmetMiddleware,
  globalLimiter,
  authLimiter,
  aiLimiter,
  uploadLimiter,
  sanitizeInputs,
  sanitizeValue,
  staticUploadHeaders,
};
