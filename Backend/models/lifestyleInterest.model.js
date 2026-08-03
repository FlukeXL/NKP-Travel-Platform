const { getDb, COLLECTIONS } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

function interestsCollection() {
  const db = getDb();
  if (!db) throw new ApiError(503, 'Firestore ยังไม่ได้ตั้งค่า (Firebase Admin credentials missing)');
  return db.collection(COLLECTIONS.LIFESTYLE_INTERESTS);
}

function docId(uid, category) {
  return `${uid}_${category}`;
}

async function addInterest(uid, category) {
  const doc = { uid, category, createdAt: new Date().toISOString() };
  await interestsCollection().doc(docId(uid, category)).set(doc);
  return doc;
}

async function removeInterest(uid, category) {
  await interestsCollection().doc(docId(uid, category)).delete();
}

async function isInterested(uid, category) {
  const snap = await interestsCollection().doc(docId(uid, category)).get();
  return snap.exists;
}

async function getInterestCount(category) {
  const snap = await interestsCollection().where('category', '==', category).count().get();
  return snap.data().count;
}

module.exports = { addInterest, removeInterest, isInterested, getInterestCount };
