const { getDb, COLLECTIONS } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

function favoritesCollection() {
  const db = getDb();
  if (!db) throw new ApiError(503, 'Firestore ยังไม่ได้ตั้งค่า (Firebase Admin credentials missing)');
  return db.collection(COLLECTIONS.FAVORITES);
}

function docId(uid, placeId) {
  return `${uid}_${placeId}`;
}

async function addFavorite(uid, placeId) {
  const doc = { uid, placeId, createdAt: new Date().toISOString() };
  await favoritesCollection().doc(docId(uid, placeId)).set(doc);
  return doc;
}

async function removeFavorite(uid, placeId) {
  await favoritesCollection().doc(docId(uid, placeId)).delete();
}

async function isFavorite(uid, placeId) {
  const snap = await favoritesCollection().doc(docId(uid, placeId)).get();
  return snap.exists;
}

async function getFavoritePlaceIds(uid) {
  const snap = await favoritesCollection().where('uid', '==', uid).get();
  return snap.docs.map((d) => d.data().placeId);
}

module.exports = { addFavorite, removeFavorite, isFavorite, getFavoritePlaceIds };
