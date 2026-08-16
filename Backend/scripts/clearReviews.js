const { getDatabases, isAppwriteReady, databaseId, COLLECTIONS } = require('../config/database');
const devStore = require('../utils/devStore');

async function clearAll() {
  console.log('Clearing reviews and posts...');

  // Clear local devStore
  devStore.writeAll('reviews', {});
  devStore.writeAll('checkin_posts', {});
  devStore.writeAll('review_comments', {});
  devStore.writeAll('review_likes', {});
  devStore.writeAll('checkin_comments', {});
  devStore.writeAll('checkin_likes', {});
  console.log('Local devStore cleared.');

  // Clear Appwrite if configured
  if (isAppwriteReady()) {
    try {
      const db = getDatabases();
      const collectionsToClear = [
        COLLECTIONS.REVIEWS,
        COLLECTIONS.CHECKIN_POSTS,
        COLLECTIONS.REVIEW_COMMENTS,
        COLLECTIONS.REVIEW_LIKES,
        COLLECTIONS.CHECKIN_COMMENTS,
        COLLECTIONS.CHECKIN_LIKES
      ];

      for (const coll of collectionsToClear) {
        if (!coll) continue;
        console.log(`Fetching docs for ${coll}...`);
        try {
          const res = await db.listDocuments(databaseId, coll);
          for (const doc of res.documents) {
            await db.deleteDocument(databaseId, coll, doc.$id);
          }
          console.log(`Cleared ${res.documents.length} docs from ${coll}`);
        } catch(e) {
          console.log(`Skipped ${coll} or error: ${e.message}`);
        }
      }
    } catch (err) {
      console.log('Error clearing Appwrite:', err.message);
    }
  }

  console.log('Done!');
}

clearAll().then(() => process.exit(0));
