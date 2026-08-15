const { getDatabases, isAppwriteReady, databaseId, COLLECTIONS, Query } = require('../config/database');
const devStore = require('../utils/devStore');
const { sanitizeAppwriteId } = require('../utils/sanitizeId');

const DEV_FAVORITES = 'favorites';

function sanitizeId(id) {
  return sanitizeAppwriteId(id, 'fav');
}

function docId(uid, placeId) {
  return sanitizeId(`${uid}_${placeId}`);
}

async function addFavorite(uid, placeId) {
  const id = docId(uid, placeId);
  const now = new Date().toISOString();
  const payload = { uid: String(uid), placeId: String(placeId), createdAt: now };

  if (isAppwriteReady()) {
    try {
      await getDatabases().createDocument(databaseId, COLLECTIONS.FAVORITES, id, payload);
      return payload;
    } catch (err) {
      if (err.code === 409) return payload;
      console.warn('[favorite.model] Appwrite addFavorite failed:', err.message);
    }
  }

  devStore.set(DEV_FAVORITES, id, payload);
  return payload;
}

async function removeFavorite(uid, placeId) {
  const id = docId(uid, placeId);
  if (isAppwriteReady()) {
    try {
      await getDatabases().deleteDocument(databaseId, COLLECTIONS.FAVORITES, id);
      return;
    } catch (err) {
      if (err.code !== 404) console.warn('[favorite.model] Appwrite removeFavorite failed:', err.message);
    }
  }

  devStore.delete(DEV_FAVORITES, id);
}

async function isFavorite(uid, placeId) {
  if (!uid || !placeId) return false;
  const id = docId(uid, placeId);
  if (isAppwriteReady()) {
    try {
      await getDatabases().getDocument(databaseId, COLLECTIONS.FAVORITES, id);
      return true;
    } catch {
      return false;
    }
  }

  return Boolean(devStore.get(DEV_FAVORITES, id));
}

async function getFavoritePlaceIds(uid) {
  if (!uid) return [];
  if (isAppwriteReady()) {
    try {
      const res = await getDatabases().listDocuments(databaseId, COLLECTIONS.FAVORITES, [
        Query.equal('uid', String(uid)),
        Query.limit(100),
      ]);
      return res.documents.map((d) => d.placeId);
    } catch (err) {
      console.warn('[favorite.model] Appwrite getFavoritePlaceIds failed:', err.message);
    }
  }

  const list = devStore.list(DEV_FAVORITES).filter((f) => f.uid === String(uid));
  return list.map((f) => f.placeId);
}

async function getFavoritesCount() {
  if (isAppwriteReady()) {
    try {
      const res = await getDatabases().listDocuments(databaseId, COLLECTIONS.FAVORITES, [Query.limit(1)]);
      return res.total || 0;
    } catch (err) {
      console.warn('[favorite.model] Appwrite getFavoritesCount failed:', err.message);
    }
  }
  return devStore.list(DEV_FAVORITES).length;
}

module.exports = { addFavorite, removeFavorite, isFavorite, getFavoritePlaceIds, getFavoritesCount };
