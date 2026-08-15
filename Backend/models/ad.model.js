const { getDatabases, isAppwriteReady, databaseId, COLLECTIONS, Query, ID } = require('../config/database');
const devStore = require('../utils/devStore');
const { sanitizeAppwriteId } = require('../utils/sanitizeId');

const DEV_ADS = 'ads';

function sanitizeId(id) {
  return sanitizeAppwriteId(id, 'ad');
}

function formatDoc(doc) {
  if (!doc) return null;
  const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...rest } = doc;
  return {
    _id: rest._id || rest.id || $id,
    ...rest,
    isActive: typeof rest.isActive === 'boolean' ? rest.isActive : true,
    createdAt: rest.createdAt || $createdAt || new Date().toISOString(),
  };
}

async function getActiveAds() {
  if (isAppwriteReady()) {
    try {
      const res = await getDatabases().listDocuments(databaseId, COLLECTIONS.ADS, [
        Query.equal('isActive', true),
        Query.limit(50),
      ]);
      const list = res.documents.map(formatDoc);
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (err) {
      console.warn('[ad.model] Appwrite getActiveAds failed:', err.message);
    }
  }

  const list = devStore.list(DEV_ADS).filter((a) => a.isActive !== false);
  return list.map(formatDoc).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

async function getAllAds() {
  if (isAppwriteReady()) {
    try {
      const res = await getDatabases().listDocuments(databaseId, COLLECTIONS.ADS, [
        Query.limit(50),
      ]);
      const list = res.documents.map(formatDoc);
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (err) {
      console.warn('[ad.model] Appwrite getAllAds failed:', err.message);
    }
  }

  const list = devStore.list(DEV_ADS);
  return list.map(formatDoc).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

async function createAd(data) {
  const id = ID.unique();
  const now = new Date().toISOString();
  const payload = {
    title: String(data.title || ''),
    imageUrl: String(data.imageUrl || ''),
    linkUrl: String(data.linkUrl || ''),
    isActive: typeof data.isActive === 'boolean' ? data.isActive : true,
    placement: String(data.placement || 'home'),
    createdAt: now,
  };

  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().createDocument(databaseId, COLLECTIONS.ADS, id, payload);
      return formatDoc(doc);
    } catch (err) {
      console.warn('[ad.model] Appwrite createAd failed:', err.message);
    }
  }

  const record = { _id: id, ...payload };
  devStore.set(DEV_ADS, id, record);
  return record;
}

async function getAdById(id) {
  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().getDocument(databaseId, COLLECTIONS.ADS, sanitizeId(id));
      return formatDoc(doc);
    } catch {
      return null;
    }
  }

  const ad = devStore.get(DEV_ADS, String(id));
  return ad ? formatDoc(ad) : null;
}

async function updateAd(id, data) {
  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().updateDocument(databaseId, COLLECTIONS.ADS, sanitizeId(id), data);
      return formatDoc(doc);
    } catch (err) {
      console.warn('[ad.model] Appwrite updateAd failed:', err.message);
    }
  }

  const current = devStore.get(DEV_ADS, String(id)) || { _id: String(id) };
  const updated = { ...current, ...data };
  devStore.set(DEV_ADS, String(id), updated);
  return formatDoc(updated);
}

async function deleteAd(id) {
  if (isAppwriteReady()) {
    try {
      await getDatabases().deleteDocument(databaseId, COLLECTIONS.ADS, sanitizeId(id));
      return true;
    } catch (err) {
      if (err.code !== 404) console.warn('[ad.model] Appwrite deleteAd failed:', err.message);
    }
  }

  devStore.delete(DEV_ADS, String(id));
  return true;
}

module.exports = {
  getActiveAds,
  getAllAds,
  createAd,
  getAdById,
  updateAd,
  deleteAd,
};
