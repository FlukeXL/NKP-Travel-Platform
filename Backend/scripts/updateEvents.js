require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { getDatabases, isAppwriteReady, databaseId, COLLECTIONS } = require('../config/database');

async function updateEvents() {
  if (!isAppwriteReady()) {
    console.error('Appwrite is not ready');
    process.exit(1);
  }

  const databases = getDatabases();

  const updates = [
    {
      id: 'event-songkran-mekong',
      data: {
        img: '/assets/images/events/event-songkran.png',
        banner: '/assets/images/events/event-songkran.png',
      },
    },
    {
      id: 'event-naga-worship',
      data: {
        img: '/assets/images/events/event-naga-worship.png',
        banner: '/assets/images/events/event-naga-worship.png',
      },
    },
    {
      id: 'event-fireboat',
      data: {
        img: '/assets/images/events/event-fireboat.png',
        banner: '/assets/images/events/event-fireboat.png',
      },
    },
  ];

  for (const item of updates) {
    try {
      await databases.updateDocument(databaseId, COLLECTIONS.EVENTS, item.id, item.data);
      console.log(`✔ Updated event: ${item.id}`);
    } catch (err) {
      console.error(`❌ Failed to update ${item.id}:`, err.message);
    }
  }

  console.log('🎉 All event banners updated successfully!');
}

updateEvents().catch((err) => {
  console.error(err);
  process.exit(1);
});
