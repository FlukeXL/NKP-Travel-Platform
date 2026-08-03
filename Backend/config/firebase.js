const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const env = require('./env');

let app = null;

function initFirebase() {
  if (app) return app;
  if (!env.FIREBASE_CONFIGURED) return null;

  try {
    let credential;
    if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccount = require(path.resolve(env.FIREBASE_SERVICE_ACCOUNT_PATH));
      credential = admin.cert(serviceAccount);
    } else {
      credential = admin.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY,
      });
    }

    app = admin.initializeApp({ credential });
    console.log('[firebase] Admin SDK initialized for project:', env.FIREBASE_PROJECT_ID || '(from service account file)');
    return app;
  } catch (err) {
    console.error('[firebase] Failed to initialize Admin SDK:', err.message);
    return null;
  }
}

const firebaseApp = initFirebase();

function isFirebaseReady() {
  return !!firebaseApp;
}

const auth = firebaseApp ? getAuth(firebaseApp) : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;

module.exports = { admin, auth, db, isFirebaseReady };
