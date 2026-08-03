const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./Backend/config/firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

async function getAds() {
  const snapshot = await db.collection('ADS').get();
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}
getAds();
