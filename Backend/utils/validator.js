const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email) && email.length <= 254;
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

function isValidDate(dateStr) {
  return typeof dateStr === 'string' && DATE_RE.test(dateStr) && !Number.isNaN(new Date(dateStr).getTime());
}

function isValidId(id) {
  return typeof id === 'string' && SAFE_ID_RE.test(id);
}

function isValidUrl(urlStr) {
  if (typeof urlStr !== 'string' || !urlStr.trim()) return false;
  try {
    const parsed = new URL(urlStr);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Strips script tags, HTML entities and truncates length for safe storage
 */
function sanitizeSafeText(str, maxLength = 2000) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>?/gm, '') // Strip all HTML tags
    .replace(/javascript\s*:/gi, '')
    .trim()
    .slice(0, maxLength);
}

const VALID_INTERESTS = ['cafe', 'restaurant', 'temple', 'nature', 'fitness', 'culture', 'landmark'];
const VALID_ENV_PREFS = ['indoor', 'outdoor', 'both'];
const VALID_PACE_PREFS = ['comfort', 'adventure', 'both'];

function sanitizeProfile(profile = {}) {
  const out = {};
  if (isValidDate(profile.birthdate)) out.birthdate = profile.birthdate;
  if (Array.isArray(profile.interests)) {
    out.interests = profile.interests.filter((i) => VALID_INTERESTS.includes(i));
  }
  if (VALID_ENV_PREFS.includes(profile.envPref)) out.envPref = profile.envPref;
  if (VALID_PACE_PREFS.includes(profile.pacePref)) out.pacePref = profile.pacePref;
  return out;
}

module.exports = {
  isValidEmail,
  isValidPassword,
  isValidDate,
  isValidId,
  isValidUrl,
  sanitizeSafeText,
  sanitizeProfile,
  VALID_INTERESTS,
  VALID_ENV_PREFS,
  VALID_PACE_PREFS,
};
