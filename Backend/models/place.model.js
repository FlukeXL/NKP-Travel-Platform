const { getDb, COLLECTIONS } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

function placesCollection() {
  const db = getDb();
  if (!db) throw new ApiError(503, 'Firestore ยังไม่ได้ตั้งค่า (Firebase Admin credentials missing)');
  return db.collection(COLLECTIONS.PLACES);
}

async function createPlace(id, data) {
  const doc = { ...data, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await placesCollection().doc(id).set(doc);
  return doc;
}

async function getAllPlaces() {
  const snap = await placesCollection().orderBy('createdAt', 'desc').get();
  return snap.docs.map((d) => d.data());
}

async function getPlaceById(id) {
  const snap = await placesCollection().doc(id).get();
  return snap.exists ? snap.data() : null;
}

async function updatePlace(id, patch) {
  await placesCollection().doc(id).set({ ...patch, updatedAt: new Date().toISOString() }, { merge: true });
  return getPlaceById(id);
}

async function deletePlace(id) {
  await placesCollection().doc(id).delete();
}

module.exports = { createPlace, getAllPlaces, getPlaceById, updatePlace, deletePlace };
