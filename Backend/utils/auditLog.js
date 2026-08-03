/**
 * Central audit logging helper — every admin action that changes or
 * removes data (place CRUD, publish toggle, review/video/check-in/
 * comment moderation deletes, user role changes) calls
 * `recordAuditLog()` so there's a permanent, append-only trail of
 * "who did what, when" visible in the Admin Panel's "Audit Log" tab.
 *
 * Never throws — a logging failure must NEVER block the actual admin
 * action from completing (e.g. if Firestore audit_logs write fails
 * for some reason, the place still gets deleted; we just lose that
 * one log entry, which is logged to the server console instead).
 */
const { isFirebaseReady } = require('../config/firebase');
const devStore = require('../utils/devStore');

const DEV_AUDIT_LOGS = 'audit_logs';

async function resolveActor(req) {
  if (!req.user) return { uid: null, name: 'ระบบ', email: null };
  try {
    if (isFirebaseReady()) {
      const userModel = require('../models/user.model');
      const profile = await userModel.getUserById(req.user.uid);
      return { uid: req.user.uid, name: profile?.name || req.user.email, email: req.user.email };
    }
    const record = devStore.get('auth_users', req.user.uid);
    return { uid: req.user.uid, name: record?.name || req.user.email, email: req.user.email };
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

    if (isFirebaseReady()) {
      const auditLogModel = require('../models/auditLog.model');
      await auditLogModel.addLog(doc);
    } else {
      const id = `log_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
      devStore.set(DEV_AUDIT_LOGS, id, { id, ...doc, createdAt: new Date().toISOString() });
    }
  } catch (err) {
    console.error('[auditLog] Failed to record audit log entry (action continues anyway):', err.message);
  }
}

module.exports = { recordAuditLog };
