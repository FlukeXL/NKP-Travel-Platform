const crypto = require('crypto');

function sanitizeAppwriteId(id, prefix = 'doc_') {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9]/g, '') || 'doc';

  if (!id || typeof id !== 'string') {
    return `${safePrefix}_${crypto.randomBytes(6).toString('hex')}`.slice(0, 36);
  }

  const raw = id.trim();

  // Replace any character not in [a-zA-Z0-9._-] with a hyphen
  let clean = raw
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/_+/g, '_');

  // Strip leading special characters so it starts with [a-zA-Z0-9]
  clean = clean.replace(/^[^a-zA-Z0-9]+/, '');

  // If after stripping, clean is empty (e.g. was all Thai), generate deterministic hash
  if (!clean || !/^[a-zA-Z0-9]/.test(clean)) {
    const hash = crypto.createHash('md5').update(raw).digest('hex').slice(0, 16);
    clean = `${safePrefix}_${hash}`;
  }

  // Ensure max length is 36 chars and does not end with special char
  clean = clean.slice(0, 36).replace(/[^a-zA-Z0-9]+$/, '');

  // Final sanity check: must start with [a-zA-Z0-9]
  if (!clean || !/^[a-zA-Z0-9]/.test(clean)) {
    clean = `${safePrefix}_${crypto.randomBytes(6).toString('hex')}`;
  }

  return clean.slice(0, 36);
}

module.exports = { sanitizeAppwriteId };
