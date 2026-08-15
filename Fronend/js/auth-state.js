const MNX_SESSION_KEY = 'mnx_session';
const MNX_AUTH_PROVIDER_KEY = 'mnx_auth_provider';

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

async function mnxFinalizeAuthResponse(data) {
  if (data.token) {
    window.MNX_API.setToken(data.token);
    localStorage.setItem(MNX_AUTH_PROVIDER_KEY, 'jwt');
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
  if (window.MNX_FIREBASE?.signInWithGoogle) {
    try {
      const googleData = await window.MNX_FIREBASE.signInWithGoogle();
      const data = await window.MNX_API.post('/auth/google', googleData);
      return mnxFinalizeAuthResponse(data);
    } catch (err) {
      throw err;
    }
  }
  throw new Error('ระบบ Google Sign-in ยังไม่ได้เปิดใช้งาน');
}

async function mnxRefreshSession() {
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
  window.MNX_API.setToken(null);
  localStorage.removeItem(MNX_AUTH_PROVIDER_KEY);
  mnxSetSession(null);
  document.dispatchEvent(new CustomEvent('auth:changed', { detail: { session: null } }));
}

async function mnxCompressAvatar(file, maxDim = 600, quality = 0.85) {
  if (!file || !file.type.startsWith('image/')) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: mimeType,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          mimeType,
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

function mnxGetAvatarUrl(avatar) {
  if (!avatar) return '/Fronend/assets/images/avatar-placeholder.png';
  // base64 data URIs are no longer stored — they are legacy. Show placeholder instead.
  if (avatar.startsWith('data:')) return '/Fronend/assets/images/avatar-placeholder.png';
  if (/^https?:\/\//.test(avatar)) return avatar;
  if (avatar.startsWith('/uploads/')) {
    const apiOrigin = (window.MNX_API?.baseUrl || 'http://localhost:4000/api').replace(/\/api\/?$/, '');
    return `${apiOrigin}${avatar}`;
  }
  if (avatar.startsWith('/assets/')) {
    return `/Fronend${avatar}`;
  }
  return avatar;
}


async function mnxUpdateAvatar(fileOrBlob) {
  const session = mnxGetSession();
  if (!session) throw new Error('กรุณาเข้าสู่ระบบก่อน');

  let uploadTarget = fileOrBlob;
  if (fileOrBlob instanceof File || fileOrBlob instanceof Blob) {
    try {
      uploadTarget = await mnxCompressAvatar(fileOrBlob, 600, 0.85);
    } catch {
      uploadTarget = fileOrBlob;
    }
  }

  const formData = new FormData();
  formData.append('avatar', uploadTarget, uploadTarget.name || 'avatar.jpg');

  const data = await window.MNX_API.postForm(`/users/${session.uid}/avatar`, formData);
  mnxSetSession(data.user);
  document.dispatchEvent(new CustomEvent('auth:changed', { detail: { session: data.user } }));
  return data.user;
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
  updateAvatar: mnxUpdateAvatar,
  getAvatarUrl: mnxGetAvatarUrl,
  compressAvatar: mnxCompressAvatar,
};

document.addEventListener('includes:loaded', () => {
  mnxRefreshSession();
});

