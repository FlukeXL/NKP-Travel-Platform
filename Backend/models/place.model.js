const { getDatabases, isAppwriteReady, databaseId, COLLECTIONS, Query } = require('../config/database');
const devStore = require('../utils/devStore');
const { sanitizeAppwriteId } = require('../utils/sanitizeId');

const DEV_COL = 'places';

function sanitizeId(id) {
  return sanitizeAppwriteId(id, 'place');
}

function formatDoc(doc) {
  if (!doc) return null;
  const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...rest } = doc;
  return {
    id: rest.id || $id,
    ...rest,
    createdAt: rest.createdAt || $createdAt,
    updatedAt: rest.updatedAt || $updatedAt,
  };
}

async function createPlace(id, data) {
  const docId = sanitizeId(id);
  const now = new Date().toISOString();
  const payload = {
    id: docId,
    name: String(data.name || ''),
    nameEn: String(data.nameEn || ''),
    category: String(data.category || ''),
    lifestyle: String(data.lifestyle || data.category2 || ''),
    rating: Number(data.rating) || 4.5,
    lat: Number(data.lat) || 0,
    lng: Number(data.lng) || 0,
    img: String(data.img || ''),
    images: Array.isArray(data.images) ? data.images : [],
    desc: String(data.desc || ''),
    address: String(data.address || ''),
    area: String(data.area || ''),
    openHours: String(data.openHours || ''),
    tel: String(data.tel || ''),
    price: String(data.price || ''),
    tags: Array.isArray(data.tags) ? data.tags : [],
    popularity: Number(data.popularity) || 0,
    published: typeof data.published === 'boolean' ? data.published : true,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().createDocument(databaseId, COLLECTIONS.PLACES, docId, payload);
      return formatDoc(doc);
    } catch (err) {
      if (err.code === 409) {
        const doc = await getDatabases().updateDocument(databaseId, COLLECTIONS.PLACES, docId, payload);
        return formatDoc(doc);
      }
      throw err;
    }
  }

  devStore.set(DEV_COL, String(id), payload);
  return payload;
}

async function getAllPlaces() {
  if (isAppwriteReady()) {
    try {
      const res = await getDatabases().listDocuments(databaseId, COLLECTIONS.PLACES, [
        Query.limit(100),
        Query.orderDesc('createdAt'),
      ]);
      return res.documents.map(formatDoc);
    } catch (err) {
      console.warn('[place.model] Appwrite list failed, falling back to devStore:', err.message);
    }
  }

  const list = devStore.list(DEV_COL);
  return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

async function getPlaceById(id) {
  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().getDocument(databaseId, COLLECTIONS.PLACES, sanitizeId(id));
      return formatDoc(doc);
    } catch (err) {
      if (err.code === 404) {
        // also try querying by 'id' field if slug doesn't match $id
        try {
          const res = await getDatabases().listDocuments(databaseId, COLLECTIONS.PLACES, [
            Query.equal('id', String(id)),
            Query.limit(1),
          ]);
          if (res.documents.length > 0) return formatDoc(res.documents[0]);
        } catch {
        }
        return null;
      }
      console.warn('[place.model] Appwrite get failed:', err.message);
    }
  }

  return devStore.get(DEV_COL, String(id));
}

async function updatePlace(id, patch) {
  const now = new Date().toISOString();
  const docId = sanitizeId(id);
  const cleanPatch = { ...patch, updatedAt: now };
  if (cleanPatch.category2 !== undefined) {
    if (!cleanPatch.lifestyle) cleanPatch.lifestyle = cleanPatch.category2;
    delete cleanPatch.category2;
  }

  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().updateDocument(databaseId, COLLECTIONS.PLACES, docId, cleanPatch);
      return formatDoc(doc);
    } catch (err) {
      console.warn('[place.model] Appwrite update failed:', err.message);
    }
  }

  const current = devStore.get(DEV_COL, String(id)) || { id: String(id) };
  const updated = { ...current, ...cleanPatch };
  devStore.set(DEV_COL, String(id), updated);
  return updated;
}

async function deletePlace(id) {
  if (isAppwriteReady()) {
    try {
      await getDatabases().deleteDocument(databaseId, COLLECTIONS.PLACES, sanitizeId(id));
      return;
    } catch (err) {
      if (err.code !== 404) console.warn('[place.model] Appwrite delete failed:', err.message);
    }
  }

  devStore.delete(DEV_COL, String(id));
}

module.exports = { createPlace, getAllPlaces, getPlaceById, updatePlace, deletePlace };
