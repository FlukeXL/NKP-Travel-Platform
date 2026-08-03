require('dotenv').config();
const { db } = require('./config/firebase');
async function run() {
  const snapshot = await db.collection('ADS').get();
  snapshot.forEach(doc => console.log(doc.id, '=>', doc.data()));
}
run();
