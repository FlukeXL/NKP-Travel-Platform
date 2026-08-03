let MNX_FAVORITE_IDS = new Set();
let mnxFavoritesLoaded = false;

async function mnxLoadFavorites() {
  if (!window.MNX_AUTH?.isLoggedIn()) {
    MNX_FAVORITE_IDS = new Set();
    mnxFavoritesLoaded = true;
    document.dispatchEvent(new CustomEvent('favorites:ready'));
    return;
  }
  try {
    const data = await window.MNX_API.get('/favorites');
    MNX_FAVORITE_IDS = new Set(data.placeIds);
  } catch (err) {
    console.error('[favorites-data.js] Failed to load favorites:', err.message);
    MNX_FAVORITE_IDS = new Set();
  }
  mnxFavoritesLoaded = true;
  document.dispatchEvent(new CustomEvent('favorites:ready'));
}

function mnxIsFavorite(placeId) {
  return MNX_FAVORITE_IDS.has(placeId);
}

async function mnxToggleFavorite(placeId) {
  if (!window.MNX_AUTH?.isLoggedIn()) throw new Error('กรุณาเข้าสู่ระบบก่อนบันทึกรายการที่ชอบ');

  const currentlyFavorited = MNX_FAVORITE_IDS.has(placeId);
  if (currentlyFavorited) {
    await mnxApiDelete(`/favorites/${encodeURIComponent(placeId)}`);
    MNX_FAVORITE_IDS.delete(placeId);
  } else {
    await window.MNX_API.post(`/favorites/${encodeURIComponent(placeId)}`);
    MNX_FAVORITE_IDS.add(placeId);
  }
  document.dispatchEvent(new CustomEvent('favorites:changed', { detail: { placeId, favorited: !currentlyFavorited } }));
  return !currentlyFavorited;
}

async function mnxApiDelete(path) {
  const headers = {};
  const token = window.MNX_API.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${window.MNX_API.baseUrl}${path}`, { method: 'DELETE', headers });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || `เกิดข้อผิดพลาด (HTTP ${res.status})`);
  return json.data;
}

window.MNX_FAVORITES = {
  load: mnxLoadFavorites,
  isFavorite: mnxIsFavorite,
  toggle: mnxToggleFavorite,
  getIds: () => [...MNX_FAVORITE_IDS],
};
