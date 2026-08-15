require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { getDatabases, isAppwriteReady, databaseId, COLLECTIONS, Query } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function clearAllPlaces() {
  console.log('Clearing all places from Appwrite and local devStore...');
  
  if (isAppwriteReady()) {
    const databases = getDatabases();
    let hasMore = true;
    let deletedCount = 0;
    while (hasMore) {
      const res = await databases.listDocuments(databaseId, COLLECTIONS.PLACES, [Query.limit(100)]);
      if (res.documents.length === 0) {
        hasMore = false;
        break;
      }
      for (const doc of res.documents) {
        await databases.deleteDocument(databaseId, COLLECTIONS.PLACES, doc.$id);
        deletedCount++;
        console.log(`Deleted place: ${doc.name || doc.$id} (${doc.$id})`);
      }
    }
    console.log(`✔ Appwrite: Deleted ${deletedCount} places.`);
  }

  // Clear local devdata places.json if exists
  const devFile = path.resolve(__dirname, '../.devdata/places.json');
  if (fs.existsSync(devFile)) {
    fs.writeFileSync(devFile, '{}', 'utf8');
    console.log('✔ DevStore: Cleared .devdata/places.json');
  }

  console.log('🎉 Places collection is now completely empty. The user can add places from Admin Dashboard.');
}

clearAllPlaces().catch((err) => {
  console.error('❌ Error clearing places:', err.message);
  process.exit(1);
});
