require('dotenv').config();
const { db } = require('./config/firebase');
const fs = require('fs');
async function run() {
  const snapshot = await db.collection('ads').get();
  const ads = [];
  snapshot.forEach(doc => ads.push({ id: doc.id, ...doc.data() }));
  fs.writeFileSync('ads.json', JSON.stringify(ads, null, 2));
  process.exit(0);
}
run();
