const { getDb, COLLECTIONS } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

function logsCollection() {
  const db = getDb();
  if (!db) throw new ApiError(503, 'Firestore ยังไม่ได้ตั้งค่า (Firebase Admin credentials missing)');
  return db.collection(COLLECTIONS.AUDIT_LOGS);
}

async function addLog(entry) {
  const doc = { ...entry, createdAt: new Date().toISOString() };
  const ref = await logsCollection().add(doc);
  return { id: ref.id, ...doc };
}

async function getRecentLogs(limit = 200) {
  const snap = await logsCollection().orderBy('createdAt', 'desc').limit(limit).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function deleteLog(id) {
  await logsCollection().doc(id).delete();
}

async function deleteAllLogs() {
  const snap = await logsCollection().get();
  if (snap.empty) return 0;
  const batches = [];
  const db = getDb();
  for (let i = 0; i < snap.docs.length; i += 450) {
    const chunk = snap.docs.slice(i, i + 450);
    const batch = db.batch();
    chunk.forEach((d) => batch.delete(d.ref));
    batches.push(batch.commit());
  }
  await Promise.all(batches);
  return snap.docs.length;
}

async function deleteLogsOlderThan(cutoffIso) {
  const snap = await logsCollection().where('createdAt', '<', cutoffIso).get();
  if (snap.empty) return 0;
  const db = getDb();
  const batches = [];
  for (let i = 0; i < snap.docs.length; i += 450) {
    const chunk = snap.docs.slice(i, i + 450);
    const batch = db.batch();
    chunk.forEach((d) => batch.delete(d.ref));
    batches.push(batch.commit());
  }
  await Promise.all(batches);
  return snap.docs.length;
}

module.exports = { addLog, getRecentLogs, deleteLog, deleteAllLogs, deleteLogsOlderThan };
