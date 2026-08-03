const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./config/firebase-service-account.json');

try {
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();
  db.collection('ads').get().then(snapshot => {
    snapshot.forEach(doc => console.log(doc.id, '=>', doc.data()));
    process.exit(0);
  });
} catch(e) {
  console.log(e);
}
