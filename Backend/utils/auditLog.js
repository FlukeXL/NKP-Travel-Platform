const userModel = require('../models/user.model');
const auditLogModel = require('../models/auditLog.model');

async function resolveActor(req) {
  if (!req.user) return { uid: null, name: 'ระบบ', email: null };
  try {
    const profile = await userModel.getUserById(req.user.uid);
    return { uid: req.user.uid, name: profile?.name || req.user.email, email: req.user.email };
  } catch {
    return { uid: req.user.uid, name: req.user.email, email: req.user.email };
  }
}

/**
 * @param {import('express').Request} req - used to resolve the acting admin's identity
 * @param {object} entry
 * @param {string} entry.action - e.g. "place.create", "place.delete", "review.delete", "user.promote"
 * @param {string} entry.targetType - e.g. "place", "review", "video", "checkin", "comment", "user"
 * @param {string} entry.targetId
 * @param {string} [entry.targetLabel] - human-readable label shown in the log (place name, review author, etc.)
 * @param {object} [entry.details] - small extra context (e.g. { category, before, after })
 */
async function recordAuditLog(req, entry) {
  try {
    const actor = await resolveActor(req);
    const doc = {
      actorUid: actor.uid,
      actorName: actor.name,
      actorEmail: actor.email,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      targetLabel: entry.targetLabel || null,
      details: entry.details || null,
    };

    await auditLogModel.addLog(doc);
  } catch (err) {
    console.error('[auditLog] Failed to record audit log entry (action continues anyway):', err.message);
  }
}

module.exports = { recordAuditLog };
