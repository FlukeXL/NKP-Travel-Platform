const MNX_API_BASE = (() => {
  const { hostname, protocol, port } = window.location;
  if (protocol === 'file:') {
    return 'http://localhost:4000/api';
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1' || port === '8000') {
    return `${protocol}//${hostname}:4000/api`;
  }
  if (hostname.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/)) {
    return `${protocol}//${hostname}:4000/api`;
  }
  return '/api';
})();

const MNX_TOKEN_KEY = 'mnx_token';

function mnxGetToken() {
  return localStorage.getItem(MNX_TOKEN_KEY);
}

function mnxSetToken(token) {
  if (token) localStorage.setItem(MNX_TOKEN_KEY, token);
  else localStorage.removeItem(MNX_TOKEN_KEY);
}

async function mnxApiRequest(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = mnxGetToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${MNX_API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error('เซิร์ฟเวอร์ตอบกลับข้อมูลที่ไม่ถูกต้อง');
  }

  if (!res.ok || !json.success) {
    throw new Error(json.error || `เกิดข้อผิดพลาด (HTTP ${res.status})`);
  }
  return json.data;
}

async function mnxApiRequestForm(method, path, formData) {
  const headers = {};
  const token = mnxGetToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${MNX_API_BASE}${path}`, { method, headers, body: formData });
  } catch (networkErr) {
    throw new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error('เซิร์ฟเวอร์ตอบกลับข้อมูลที่ไม่ถูกต้อง');
  }

  if (!res.ok || !json.success) {
    throw new Error(json.error || `เกิดข้อผิดพลาด (HTTP ${res.status})`);
  }
  return json.data;
}

window.MNX_API = {
  baseUrl: MNX_API_BASE,
  getToken: mnxGetToken,
  setToken: mnxSetToken,
  get: (path) => mnxApiRequest('GET', path),
  post: (path, body) => mnxApiRequest('POST', path, body),
  patch: (path, body) => mnxApiRequest('PATCH', path, body),
  delete: (path) => mnxApiRequest('DELETE', path),
  postForm: (path, formData) => mnxApiRequestForm('POST', path, formData),
  putForm: (path, formData) => mnxApiRequestForm('PUT', path, formData),
};
