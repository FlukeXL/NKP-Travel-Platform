const { getDatabases, isAppwriteReady, databaseId, COLLECTIONS, Query, ID } = require('../config/database');
const devStore = require('../utils/devStore');
const { sanitizeAppwriteId } = require('../utils/sanitizeId');

const DEV_LOGS = 'audit_logs';

function sanitizeId(id) {
  return sanitizeAppwriteId(id, 'log');
}

function formatDoc(doc) {
  if (!doc) return null;
  const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...rest } = doc;
  return {
    id: rest.id || $id,
    ...rest,
    createdAt: rest.createdAt || $createdAt || new Date().toISOString(),
  };
}

async function addLog(entry) {
  const id = ID.unique();
  const now = new Date().toISOString();
  const payload = {
    action: String(entry.action || ''),
    actor: String(entry.actor || ''),
    target: String(entry.target || ''),
    details: typeof entry.details === 'object' ? JSON.stringify(entry.details) : String(entry.details || ''),
    ip: String(entry.ip || ''),
    createdAt: now,
  };

  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().createDocument(databaseId, COLLECTIONS.AUDIT_LOGS, id, payload);
      return formatDoc(doc);
    } catch (err) {
      console.warn('[auditLog.model] Appwrite addLog failed:', err.message);
    }
  }

  const record = { id, ...payload };
  devStore.set(DEV_LOGS, id, record);
  return record;
}

async function getRecentLogs(limit = 200) {
  if (isAppwriteReady()) {
    try {
      const res = await getDatabases().listDocuments(databaseId, COLLECTIONS.AUDIT_LOGS, [
        Query.limit(Math.min(100, limit)),
        Query.orderDesc('createdAt'),
      ]);
      return res.documents.map(formatDoc);
    } catch (err) {
      console.warn('[auditLog.model] Appwrite getRecentLogs failed:', err.message);
    }
  }

  const list = devStore.list(DEV_LOGS).map(formatDoc);
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
}

async function deleteLog(id) {
  if (isAppwriteReady()) {
    try {
      await getDatabases().deleteDocument(databaseId, COLLECTIONS.AUDIT_LOGS, sanitizeId(id));
      return;
    } catch (err) {
      if (err.code !== 404) console.warn('[auditLog.model] Appwrite deleteLog failed:', err.message);
    }
  }

  devStore.delete(DEV_LOGS, String(id));
}

async function deleteAllLogs() {
  const logs = await getRecentLogs(500);
  for (const log of logs) {
    await deleteLog(log.id);
  }
  return logs.length;
}

async function deleteLogsOlderThan(cutoffIso) {
  const logs = await getRecentLogs(500);
  let count = 0;
  for (const log of logs) {
    if (new Date(log.createdAt) < new Date(cutoffIso)) {
      await deleteLog(log.id);
      count++;
    }
  }
  return count;
}

module.exports = { addLog, getRecentLogs, deleteLog, deleteAllLogs, deleteLogsOlderThan };
