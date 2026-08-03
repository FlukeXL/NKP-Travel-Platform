const { getDb, isFirebaseReady, COLLECTIONS } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');
const env = require('../config/env');

function usersCollection() {
  const db = getDb();
  if (!db) throw new ApiError(503, 'Firestore ยังไม่ได้ตั้งค่า (Firebase Admin credentials missing)');
  return db.collection(COLLECTIONS.USERS);
}

async function createUser(uid, data) {

  const isBootstrapAdmin = env.ADMIN_EMAILS.includes((data.email || '').toLowerCase());

  const doc = {
    uid,
    name: data.name || '',
    email: data.email || '',
    avatar: data.avatar || null,
    provider: data.provider || 'email',
    role: isBootstrapAdmin ? 'admin' : 'user',
    joinedAt: new Date().toISOString(),
    profile: {
      birthdate: data.profile?.birthdate || null,
      interests: data.profile?.interests || [],
      envPref: data.profile?.envPref || 'both',
      pacePref: data.profile?.pacePref || 'both',
    },
    aiProfile: data.aiProfile || null,
  };
  await usersCollection().doc(uid).set(doc);
  return doc;
}

async function getUserById(uid) {
  const snap = await usersCollection().doc(uid).get();
  return snap.exists ? snap.data() : null;
}

async function updateUser(uid, patch) {
  await usersCollection().doc(uid).set(patch, { merge: true });
  return getUserById(uid);
}

async function deleteUser(uid) {
  await usersCollection().doc(uid).delete();
}

async function getAllUsers() {
  const snap = await usersCollection().orderBy('joinedAt', 'desc').get();
  return snap.docs.map((d) => d.data());
}

module.exports = { createUser, getUserById, updateUser, deleteUser, getAllUsers, isFirebaseReady };
