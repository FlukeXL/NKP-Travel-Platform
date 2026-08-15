const { getDatabases, isAppwriteReady, databaseId, COLLECTIONS, Query } = require('../config/database');
const devStore = require('../utils/devStore');
const { sanitizeAppwriteId } = require('../utils/sanitizeId');

const DEV_INTERESTS = 'lifestyle_interests';

function sanitizeId(id) {
  return sanitizeAppwriteId(id, 'int');
}

function docId(uid, category) {
  return sanitizeId(`${uid}_${category}`);
}

async function addInterest(uid, category) {
  const id = docId(uid, category);
  const now = new Date().toISOString();
  const payload = { uid: String(uid), category: String(category), createdAt: now };

  if (isAppwriteReady()) {
    try {
      await getDatabases().createDocument(databaseId, COLLECTIONS.LIFESTYLE_INTERESTS, id, payload);
      return payload;
    } catch (err) {
      if (err.code === 409) return payload;
      console.warn('[lifestyleInterest.model] Appwrite addInterest failed:', err.message);
    }
  }

  devStore.set(DEV_INTERESTS, id, payload);
  return payload;
}

async function removeInterest(uid, category) {
  const id = docId(uid, category);
  if (isAppwriteReady()) {
    try {
      await getDatabases().deleteDocument(databaseId, COLLECTIONS.LIFESTYLE_INTERESTS, id);
      return;
    } catch (err) {
      if (err.code !== 404) console.warn('[lifestyleInterest.model] Appwrite removeInterest failed:', err.message);
    }
  }

  devStore.delete(DEV_INTERESTS, id);
}

async function isInterested(uid, category) {
  if (!uid || !category) return false;
  const id = docId(uid, category);
  if (isAppwriteReady()) {
    try {
      await getDatabases().getDocument(databaseId, COLLECTIONS.LIFESTYLE_INTERESTS, id);
      return true;
    } catch {
      return false;
    }
  }

  return Boolean(devStore.get(DEV_INTERESTS, id));
}

async function getInterestCount(category) {
  if (!category) return 0;
  if (isAppwriteReady()) {
    try {
      const res = await getDatabases().listDocuments(databaseId, COLLECTIONS.LIFESTYLE_INTERESTS, [
        Query.equal('category', String(category)),
        Query.limit(1),
      ]);
      return res.total || res.documents.length;
    } catch (err) {
      console.warn('[lifestyleInterest.model] Appwrite getInterestCount failed:', err.message);
    }
  }

  const list = devStore.list(DEV_INTERESTS).filter((i) => i.category === String(category));
  return list.length;
}

module.exports = { addInterest, removeInterest, isInterested, getInterestCount };
