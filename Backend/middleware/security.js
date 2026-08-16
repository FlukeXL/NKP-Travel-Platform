const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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
 * Check if request originates from local development, loopback, or private LAN
 */
function isLocalOrDevRequest(req) {
  const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
  const host = req.headers?.host || req.hostname || '';
  const isLoopback = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.startsWith('127.');
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
  const isLan = ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.');
  return isLoopback || isLocalhost || isLan || process.env.NODE_ENV !== 'production' || process.env.DISABLE_RATE_LIMIT === 'true';
}

/**
 * Standard JSON response generator for Rate Limit violations
 */
function createRateLimiter(windowMs, max, message, allowPass = false) {
  if (allowPass) {
    return (req, res, next) => next();
  }
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    statusCode: 429,
    skip: (req) => isLocalOrDevRequest(req),
    message: {
      success: false,
      error: message || 'คุณส่งคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง (Rate limit exceeded)',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    },
  });
}

// 1. Global API rate limit: very high threshold (100,000 requests) & skipped for local/LAN/dev
const globalLimiter = createRateLimiter(
  15 * 60 * 1000,
  100000,
  'คำขอใช้งาน API ถี่เกินไป กรุณารอสักครู่แล้วลองใหม่'
);

// 2. Auth rate limit: No lockout - allow users to log in / switch accounts continuously
const authLimiter = (req, res, next) => next();

// 3. AI Tour Guide chat rate limit: 200 messages per 15 minutes per IP & skipped for local/LAN/dev
const aiLimiter = createRateLimiter(
  15 * 60 * 1000,
  200,
  'ใช้งานระบบ AI ไกด์เกินจำนวนที่กำหนดชั่วคราว กรุณารอสักครู่แล้วลองใหม่'
);

// 4. File Upload rate limit: 200 upload actions per 15 minutes per IP & skipped for local/LAN/dev
const uploadLimiter = createRateLimiter(
  15 * 60 * 1000,
  200,
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
function staticUploadHeaders(res, filePath) {
  res.set('X-Content-Type-Options', 'nosniff');
  // Allow cross-origin media playback
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  // Support HTTP byte-range requests for video seeking
  res.set('Accept-Ranges', 'bytes');

  const ext = filePath ? filePath.toLowerCase().split('.').pop() : '';
  if (['mp4', 'webm', 'mov', 'ogg', 'm4v'].includes(ext)) {
    // Relax CSP for video files so browsers can play them from any origin
    res.set('Content-Security-Policy', "default-src 'none'; media-src *; img-src 'self' data:");
  } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(ext)) {
    res.set('Content-Security-Policy', "default-src 'none'; img-src 'self' data:");
  } else {
    res.set('Content-Security-Policy', "default-src 'none'");
  }
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
