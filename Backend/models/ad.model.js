const { getDb, isFirebaseReady, COLLECTIONS } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

function adsCollection() {
  const db = getDb();
  if (!db) throw new ApiError(503, 'Firestore ยังไม่ได้ตั้งค่า');
  return db.collection(COLLECTIONS.ADS);
}

async function getActiveAds() {
  if (!isFirebaseReady()) return [];
  const snapshot = await adsCollection().where('isActive', '==', true).get();
  return snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getAllAds() {
  if (!isFirebaseReady()) return [];
  const snapshot = await adsCollection().get();
  return snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function createAd(data) {
  if (!isFirebaseReady()) throw new ApiError(503, 'Firestore ยังไม่ได้ตั้งค่า');
  const docRef = await adsCollection().add({
    title: data.title,
    imageUrl: data.imageUrl,
    isActive: data.isActive,
    placement: data.placement || 'home',
    createdAt: new Date().toISOString()
  });
  const doc = await docRef.get();
  return { _id: doc.id, ...doc.data() };
}

async function getAdById(id) {
  if (!isFirebaseReady()) return null;
  const doc = await adsCollection().doc(id).get();
  if (!doc.exists) return null;
  return { _id: doc.id, ...doc.data() };
}

async function updateAd(id, data) {
  if (!isFirebaseReady()) throw new ApiError(503, 'Firestore ยังไม่ได้ตั้งค่า');
  await adsCollection().doc(id).update(data);
  return getAdById(id);
}

async function deleteAd(id) {
  if (!isFirebaseReady()) throw new ApiError(503, 'Firestore ยังไม่ได้ตั้งค่า');
  await adsCollection().doc(id).delete();
  return true;
}

module.exports = {
  getActiveAds,
  getAllAds,
  createAd,
  getAdById,
  updateAd,
  deleteAd
};
