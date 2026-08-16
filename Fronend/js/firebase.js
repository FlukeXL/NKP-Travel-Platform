const MNX_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCyGzA5S5W0Awz8o83UpU3hp-EGULnl5TM',
  authDomain: 'nakhon-phanom-lifestyle-travel.firebaseapp.com',
  projectId: 'nakhon-phanom-lifestyle-travel',
  storageBucket: 'nakhon-phanom-lifestyle-travel.firebasestorage.app',
  messagingSenderId: '600493758534',
  appId: '1:600493758534:web:778abd9cafcf09a6fe1247',
};

let mnxFirebaseApp = null;
let mnxFirebaseAuth = null;

function mnxInitFirebaseApp() {
  if (mnxFirebaseApp) return mnxFirebaseApp;
  if (typeof firebase === 'undefined') {
    console.error('[firebase.js] Firebase Web SDK not loaded — check <script> tags for firebase-app-compat.js / firebase-auth-compat.js');
    return null;
  }
  mnxFirebaseApp = firebase.initializeApp(MNX_FIREBASE_CONFIG);
  mnxFirebaseAuth = firebase.auth();
  return mnxFirebaseApp;
}

async function mnxSignInWithGoogle() {
  const isLocalIp = window.location.hostname.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/);
  
  if (isLocalIp) {
    const mockEmail = prompt("⚠️ ระบบ Google Sign-In ไม่รองรับการใช้งานผ่าน IP Address (ข้อจำกัด Firebase)\n\nกรุณากรอกอีเมล Google เพื่อจำลองการล็อกอิน:", "user.google@gmail.com");
    if (!mockEmail || !mockEmail.trim()) throw new Error('ยกเลิกการเข้าสู่ระบบ');
    return {
      idToken: 'mock_token_for_local_dev',
      name: mockEmail.split('@')[0],
      email: mockEmail,
      avatar: '/Fronend/assets/images/avatar-placeholder.png',
    };
  }

  mnxInitFirebaseApp();
  if (!mnxFirebaseAuth) throw new Error('ไม่สามารถเชื่อมต่อ Firebase ได้ กรุณาลองใหม่');

  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await mnxFirebaseAuth.signInWithPopup(provider);
    const idToken = await result.user.getIdToken();
    return {
      idToken,
      name: result.user.displayName,
      email: result.user.email,
      avatar: result.user.photoURL,
    };
  } catch (err) {
    if (err.code === 'auth/unauthorized-domain') throw new Error('โดเมนหรือ IP นี้ยังไม่ได้รับอนุญาตใน Firebase Console');
    if (err.code === 'auth/popup-closed-by-user') throw new Error('ปิดหน้าต่างเข้าสู่ระบบก่อนทำรายการเสร็จ กรุณาลองใหม่');
    if (err.code === 'auth/popup-blocked') throw new Error('เบราว์เซอร์บล็อกหน้าต่างป็อปอัพ กรุณาอนุญาตป็อปอัพแล้วลองใหม่');
    console.error(err);
    throw new Error('เข้าสู่ระบบด้วย Google ไม่สำเร็จ: ' + err.message);
  }
}

async function mnxExchangeCustomToken(customToken) {
  mnxInitFirebaseApp();
  if (!mnxFirebaseAuth) throw new Error('ไม่สามารถเชื่อมต่อ Firebase ได้ กรุณาลองใหม่');
  const result = await mnxFirebaseAuth.signInWithCustomToken(customToken);
  return result.user.getIdToken();
}

function mnxWaitForIdToken() {
  mnxInitFirebaseApp();
  if (!mnxFirebaseAuth) return Promise.resolve(null);
  return new Promise((resolve) => {
    const unsubscribe = mnxFirebaseAuth.onIdTokenChanged(async (user) => {
      unsubscribe();
      if (!user) return resolve(null);
      try {
        resolve(await user.getIdToken());
      } catch {
        resolve(null);
      }
    });
  });
}

async function mnxFirebaseSignOut() {
  mnxInitFirebaseApp();
  if (mnxFirebaseAuth?.currentUser) await mnxFirebaseAuth.signOut();
}

window.MNX_FIREBASE = {
  signInWithGoogle: mnxSignInWithGoogle,
  exchangeCustomToken: mnxExchangeCustomToken,
  waitForIdToken: mnxWaitForIdToken,
  signOut: mnxFirebaseSignOut,
};
