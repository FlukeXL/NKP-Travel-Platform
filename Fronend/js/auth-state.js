const MNX_SESSION_KEY = 'mnx_session';

function mnxGetSession() {
  try {
    const raw = localStorage.getItem(MNX_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function mnxSetSession(user) {
  if (user) localStorage.setItem(MNX_SESSION_KEY, JSON.stringify(user));
  else localStorage.removeItem(MNX_SESSION_KEY);
}

function mnxIsLoggedIn() {
  return !!mnxGetSession();
}

function mnxCalcAge(birthdate) {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  if (Number.isNaN(b.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() >= b.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

const MNX_AUTH_PROVIDER_KEY = 'mnx_auth_provider'; // 'firebase' | 'jwt-dev' — which refresh strategy to use on page load

async function mnxFinalizeAuthResponse(data) {
  if (data.tokenType === 'firebase-custom') {
    const idToken = await window.MNX_FIREBASE.exchangeCustomToken(data.token);
    window.MNX_API.setToken(idToken);
    localStorage.setItem(MNX_AUTH_PROVIDER_KEY, 'firebase');
  } else {
    window.MNX_API.setToken(data.token);
    localStorage.setItem(MNX_AUTH_PROVIDER_KEY, 'jwt-dev');
  }
  mnxSetSession(data.user);
  document.dispatchEvent(new CustomEvent('auth:changed', { detail: { session: data.user } }));
  return data.user;
}

async function mnxRegister(payload) {
  const data = await window.MNX_API.post('/auth/register', payload);
  return mnxFinalizeAuthResponse(data);
}

async function mnxLogin(payload) {
  const data = await window.MNX_API.post('/auth/login', payload);
  return mnxFinalizeAuthResponse(data);
}

async function mnxLoginWithGoogle() {
  const { idToken } = await window.MNX_FIREBASE.signInWithGoogle();
  const data = await window.MNX_API.post('/auth/google', { idToken });
  return mnxFinalizeAuthResponse(data);
}

async function mnxRefreshSession() {
  const provider = localStorage.getItem(MNX_AUTH_PROVIDER_KEY);
  if (!provider) return null;

  if (provider === 'firebase') {
    const idToken = await window.MNX_FIREBASE.waitForIdToken();
    if (!idToken) {
      mnxSetSession(null);
      localStorage.removeItem(MNX_AUTH_PROVIDER_KEY);
      document.dispatchEvent(new CustomEvent('auth:changed', { detail: { session: null } }));
      return null;
    }
    window.MNX_API.setToken(idToken);
  }

  if (!window.MNX_API.getToken()) return null;
  try {
    const data = await window.MNX_API.get('/auth/me');
    mnxSetSession(data.user);
    document.dispatchEvent(new CustomEvent('auth:changed', { detail: { session: data.user } }));
    return data.user;
  } catch {
    window.MNX_API.setToken(null);
    mnxSetSession(null);
    localStorage.removeItem(MNX_AUTH_PROVIDER_KEY);
    document.dispatchEvent(new CustomEvent('auth:changed', { detail: { session: null } }));
    return null;
  }
}

async function mnxSignOut() {
  try {
    if (window.MNX_API.getToken()) await window.MNX_API.post('/auth/logout');
  } catch {
  }
  if (localStorage.getItem(MNX_AUTH_PROVIDER_KEY) === 'firebase') {
    await window.MNX_FIREBASE.signOut();
  }
  window.MNX_API.setToken(null);
  localStorage.removeItem(MNX_AUTH_PROVIDER_KEY);
  mnxSetSession(null);
  document.dispatchEvent(new CustomEvent('auth:changed', { detail: { session: null } }));
}

async function mnxUpdateProfile(patch) {
  const session = mnxGetSession();
  if (!session) throw new Error('กรุณาเข้าสู่ระบบก่อน');
  const data = await window.MNX_API.patch(`/users/${session.uid}`, patch);
  mnxSetSession(data.user);
  document.dispatchEvent(new CustomEvent('auth:changed', { detail: { session: data.user } }));
  return data.user;
}

window.MNX_AUTH = {
  getSession: mnxGetSession,
  isLoggedIn: mnxIsLoggedIn,
  calcAge: mnxCalcAge,
  register: mnxRegister,
  login: mnxLogin,
  loginWithGoogle: mnxLoginWithGoogle,
  signOut: mnxSignOut,
  refreshSession: mnxRefreshSession,
  updateProfile: mnxUpdateProfile,
};

document.addEventListener('includes:loaded', () => {
  mnxRefreshSession();
});
