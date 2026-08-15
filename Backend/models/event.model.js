const { getDatabases, isAppwriteReady, databaseId, COLLECTIONS, Query, ID } = require('../config/database');
const devStore = require('../utils/devStore');
const { sanitizeAppwriteId } = require('../utils/sanitizeId');

const DEV_EVENTS = 'events';

function sanitizeId(id) {
  return sanitizeAppwriteId(id, 'evt');
}

function formatDoc(doc) {
  if (!doc) return null;
  const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...rest } = doc;
  const title = rest.title || rest.name || '';
  const banner = rest.banner || rest.img || '';
  const tag = rest.tag || rest.badge || rest.category || 'กิจกรรม';
  return {
    id: rest.id || $id,
    ...rest,
    title,
    name: title,
    desc: rest.desc || '',
    tag,
    badge: rest.badge || tag,
    category: rest.category || tag || 'festival',
    banner,
    img: banner,
    dates: rest.dates || '',
    startDate: rest.startDate || '',
    endDate: rest.endDate || '',
    location: rest.location || '',
    ctaHref: rest.ctaHref || rest.url || '',
    url: rest.url || rest.ctaHref || '',
    showAsPopup: typeof rest.showAsPopup === 'boolean' ? rest.showAsPopup : false,
    active: typeof rest.active === 'boolean' ? rest.active : true,
    createdAt: rest.createdAt || $createdAt || new Date().toISOString(),
  };
}

async function getAllEvents() {
  if (isAppwriteReady()) {
    try {
      const res = await getDatabases().listDocuments(databaseId, COLLECTIONS.EVENTS, [
        Query.limit(100),
      ]);
      const list = res.documents.map(formatDoc);
      return list.sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));
    } catch (err) {
      console.warn('[event.model] Appwrite getAllEvents failed:', err.message);
    }
  }

  const list = devStore.list(DEV_EVENTS).map(formatDoc);
  return list.sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));
}

async function getActiveEvents() {
  if (isAppwriteReady()) {
    try {
      const res = await getDatabases().listDocuments(databaseId, COLLECTIONS.EVENTS, [
        Query.equal('active', true),
        Query.limit(100),
      ]);
      const list = res.documents.map(formatDoc);
      return list.sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));
    } catch (err) {
      console.warn('[event.model] Appwrite getActiveEvents failed:', err.message);
    }
  }

  const list = devStore.list(DEV_EVENTS).map(formatDoc).filter((e) => e.active !== false);
  return list.sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));
}

async function createEvent(data) {
  const id = sanitizeId(data.id || ID.unique());
  const now = new Date().toISOString();
  const title = String(data.title || data.name || '');
  const banner = String(data.banner || data.img || '');
  const tag = String(data.tag || data.badge || data.category || 'กิจกรรม');

  const payload = {
    title,
    name: title,
    desc: String(data.desc || ''),
    tag,
    badge: String(data.badge || tag),
    category: String(data.category || tag || 'festival'),
    banner,
    img: banner,
    startDate: String(data.startDate || ''),
    endDate: String(data.endDate || ''),
    dates: String(data.dates || ''),
    location: String(data.location || ''),
    lat: Number(data.lat) || 0,
    lng: Number(data.lng) || 0,
    price: String(data.price || ''),
    url: String(data.url || data.ctaHref || ''),
    ctaHref: String(data.ctaHref || data.url || ''),
    showAsPopup: typeof data.showAsPopup === 'boolean' ? data.showAsPopup : false,
    active: typeof data.active === 'boolean' ? data.active : true,
    createdAt: now,
    updatedAt: now,
  };

  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().createDocument(databaseId, COLLECTIONS.EVENTS, id, payload);
      return formatDoc(doc);
    } catch (err) {
      console.warn('[event.model] Appwrite createEvent failed:', err.message);
    }
  }

  const record = { id, ...payload };
  devStore.set(DEV_EVENTS, id, record);
  return record;
}

async function updateEvent(id, patch) {
  const now = new Date().toISOString();
  const cleanPatch = { ...patch, updatedAt: now };

  if (cleanPatch.title) cleanPatch.name = cleanPatch.title;
  if (cleanPatch.banner) cleanPatch.img = cleanPatch.banner;

  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().updateDocument(databaseId, COLLECTIONS.EVENTS, sanitizeId(id), cleanPatch);
      return formatDoc(doc);
    } catch (err) {
      console.warn('[event.model] Appwrite updateEvent failed:', err.message);
    }
  }

  const current = devStore.get(DEV_EVENTS, String(id)) || { id: String(id) };
  const updated = { ...current, ...cleanPatch };
  devStore.set(DEV_EVENTS, String(id), updated);
  return formatDoc(updated);
}

async function deleteEvent(id) {
  if (isAppwriteReady()) {
    try {
      await getDatabases().deleteDocument(databaseId, COLLECTIONS.EVENTS, sanitizeId(id));
      return;
    } catch (err) {
      if (err.code !== 404) console.warn('[event.model] Appwrite deleteEvent failed:', err.message);
    }
  }

  devStore.delete(DEV_EVENTS, String(id));
}

async function getEventById(id) {
  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().getDocument(databaseId, COLLECTIONS.EVENTS, sanitizeId(id));
      return formatDoc(doc);
    } catch {
      return null;
    }
  }

  const doc = devStore.get(DEV_EVENTS, String(id));
  return doc ? formatDoc(doc) : null;
}

module.exports = { getAllEvents, getActiveEvents, createEvent, updateEvent, deleteEvent, getEventById };
