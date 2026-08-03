const MNX_LIFESTYLE_INTEREST_CACHE = {}; // { [category]: { count, interested } }

async function mnxLoadLifestyleInterest(category) {
  try {
    const data = await window.MNX_API.get(`/lifestyle/${encodeURIComponent(category)}/interest-count`);
    MNX_LIFESTYLE_INTEREST_CACHE[category] = { count: data.count, interested: !!data.interested };
  } catch (err) {
    console.error('[lifestyle-interest.js] Failed to load interest count:', err.message);
    MNX_LIFESTYLE_INTEREST_CACHE[category] = { count: 0, interested: false };
  }
  document.dispatchEvent(new CustomEvent('lifestyle-interest:ready', { detail: { category } }));
  return MNX_LIFESTYLE_INTEREST_CACHE[category];
}

function mnxIsInterested(category) {
  return !!MNX_LIFESTYLE_INTEREST_CACHE[category]?.interested;
}

function mnxGetInterestCount(category) {
  return MNX_LIFESTYLE_INTEREST_CACHE[category]?.count ?? 0;
}

async function mnxToggleLifestyleInterest(category) {
  if (!window.MNX_AUTH?.isLoggedIn()) throw new Error('กรุณาเข้าสู่ระบบก่อนเข้าร่วมกลุ่มไลฟ์สไตล์นี้');

  const current = MNX_LIFESTYLE_INTEREST_CACHE[category] || { count: 0, interested: false };
  const nowInterested = !current.interested;

  if (nowInterested) {
    await window.MNX_API.post(`/lifestyle/${encodeURIComponent(category)}/interest`);
  } else {
    await mnxLifestyleApiDelete(`/lifestyle/${encodeURIComponent(category)}/interest`);
  }

  MNX_LIFESTYLE_INTEREST_CACHE[category] = {
    count: current.count + (nowInterested ? 1 : -1),
    interested: nowInterested,
  };
  document.dispatchEvent(new CustomEvent('lifestyle-interest:changed', { detail: { category, interested: nowInterested } }));
  return nowInterested;
}

async function mnxLifestyleApiDelete(path) {
  const headers = {};
  const token = window.MNX_API.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${window.MNX_API.baseUrl}${path}`, { method: 'DELETE', headers });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || `เกิดข้อผิดพลาด (HTTP ${res.status})`);
  return json.data;
}

window.MNX_LIFESTYLE_INTEREST = {
  load: mnxLoadLifestyleInterest,
  isInterested: mnxIsInterested,
  getCount: mnxGetInterestCount,
  toggle: mnxToggleLifestyleInterest,
};
