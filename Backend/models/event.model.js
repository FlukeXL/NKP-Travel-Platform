const { getDb, COLLECTIONS } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

function eventsCollection() {
  const db = getDb();
  if (!db) throw new ApiError(503, 'Firestore ยังไม่ได้ตั้งค่า (Firebase Admin credentials missing)');
  return db.collection(COLLECTIONS.EVENTS);
}

async function getAllEvents() {
  const snap = await eventsCollection().get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return rows.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
}

async function getActiveEvents() {
  const snap = await eventsCollection().where('active', '==', true).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return rows.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
}

async function createEvent(data) {
  const doc = { ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const ref = await eventsCollection().add(doc);
  return { id: ref.id, ...doc };
}

async function updateEvent(id, patch) {
  await eventsCollection().doc(id).set({ ...patch, updatedAt: new Date().toISOString() }, { merge: true });
  const snap = await eventsCollection().doc(id).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function deleteEvent(id) {
  await eventsCollection().doc(id).delete();
}

async function getEventById(id) {
  const snap = await eventsCollection().doc(id).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

module.exports = { getAllEvents, getActiveEvents, createEvent, updateEvent, deleteEvent, getEventById };
