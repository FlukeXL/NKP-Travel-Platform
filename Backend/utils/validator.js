const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email);
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

function isValidDate(dateStr) {
  return typeof dateStr === 'string' && DATE_RE.test(dateStr) && !Number.isNaN(new Date(dateStr).getTime());
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
  sanitizeProfile,
  VALID_INTERESTS,
  VALID_ENV_PREFS,
  VALID_PACE_PREFS,
};
