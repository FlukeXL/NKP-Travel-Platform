const { Client, Databases, Permission, Role, ID } = require('node-appwrite');
const env = require('../config/env');
const { COLLECTIONS } = require('../config/database');


async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureAttribute(databases, dbId, colId, attrFn, key, ...args) {
  try {
    await attrFn.call(databases, dbId, colId, key, ...args);
    console.log(`  + Attribute created: ${key}`);
    await sleep(200);
  } catch (err) {
    if (err.code === 409) {
      // Attribute already exists
    } else {
      console.warn(`  ! Attribute warning (${key}):`, err.message);
    }
  }
}

async function initAppwriteSchema() {
  if (!env.APPWRITE_CONFIGURED) {
    console.error('❌ APPWRITE_PROJECT_ID or APPWRITE_API_KEY is missing in .env');
    process.exit(1);
  }

  const client = new Client()
    .setEndpoint(env.APPWRITE_ENDPOINT)
    .setProject(env.APPWRITE_PROJECT_ID)
    .setKey(env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const dbId = env.APPWRITE_DATABASE_ID;

  console.log(`\n============================================================`);
  console.log(`🚀 Initializing Appwrite Schema for Database: ${dbId}`);
  console.log(`Endpoint: ${env.APPWRITE_ENDPOINT}`);
  console.log(`Project:  ${env.APPWRITE_PROJECT_ID}`);
  console.log(`============================================================\n`);

  // 1. Ensure Database exists
  try {
    await databases.get(dbId);
    console.log(`✔ Database "${dbId}" already exists.`);
  } catch (err) {
    if (err.code === 404) {
      console.log(`▶ Creating Database "${dbId}"...`);
      await databases.create(dbId, 'MapNexus Database');
      console.log(`✔ Database created.`);
    } else {
      throw err;
    }
  }

  const defaultPermissions = [
    Permission.read(Role.any()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];

  // Helper to ensure collection
  async function ensureCollection(colId, name) {
    try {
      await databases.getCollection(dbId, colId);
      console.log(`\n✔ Collection "${colId}" exists.`);
    } catch (err) {
      if (err.code === 404) {
        console.log(`\n▶ Creating Collection "${colId}" (${name})...`);
        await databases.createCollection(dbId, colId, name, defaultPermissions, false, true);
        console.log(`✔ Collection "${colId}" created.`);
      } else {
        throw err;
      }
    }
  }

  // 2. Setup Collections & Attributes
  // PLACES
  await ensureCollection(COLLECTIONS.PLACES, 'Places');
  await ensureAttribute(databases, dbId, COLLECTIONS.PLACES, databases.createStringAttribute, 'id', 128, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.PLACES, databases.createStringAttribute, 'name', 255, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.PLACES, databases.createStringAttribute, 'nameEn', 255, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.PLACES, databases.createStringAttribute, 'category', 64, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.PLACES, databases.createStringAttribute, 'lifestyle', 64, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.PLACES, databases.createFloatAttribute, 'rating', false, 0, 5, 4.5);
  await ensureAttribute(databases, dbId, COLLECTIONS.PLACES, databases.createFloatAttribute, 'lat', false, -90, 90, 0);
  await ensureAttribute(databases, dbId, COLLECTIONS.PLACES, databases.createFloatAttribute, 'lng', false, -180, 180, 0);
  await ensureAttribute(databases, dbId, COLLECTIONS.PLACES, databases.createStringAttribute, 'img', 1000, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.PLACES, databases.createStringAttribute, 'images', 1000, false, undefined, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.PLACES, databases.createStringAttribute, 'desc', 5000, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.PLACES, databases.createStringAttribute, 'address', 500, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.PLACES, databases.createStringAttribute, 'area', 255, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.PLACES, databases.createStringAttribute, 'openHours', 255, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.PLACES, databases.createStringAttribute, 'tel', 64, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.PLACES, databases.createStringAttribute, 'price', 64, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.PLACES, databases.createStringAttribute, 'tags', 64, false, undefined, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.PLACES, databases.createIntegerAttribute, 'popularity', false, 0, 1000000, 0);
  await ensureAttribute(databases, dbId, COLLECTIONS.PLACES, databases.createBooleanAttribute, 'published', false, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.PLACES, databases.createStringAttribute, 'createdAt', 64, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.PLACES, databases.createStringAttribute, 'updatedAt', 64, false, '');

  // USERS
  await ensureCollection(COLLECTIONS.USERS, 'Users');
  await ensureAttribute(databases, dbId, COLLECTIONS.USERS, databases.createStringAttribute, 'uid', 64, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.USERS, databases.createStringAttribute, 'name', 255, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.USERS, databases.createStringAttribute, 'email', 255, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.USERS, databases.createStringAttribute, 'avatar', 1000, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.USERS, databases.createStringAttribute, 'provider', 32, false, 'email');
  await ensureAttribute(databases, dbId, COLLECTIONS.USERS, databases.createStringAttribute, 'role', 32, false, 'user');
  await ensureAttribute(databases, dbId, COLLECTIONS.USERS, databases.createStringAttribute, 'joinedAt', 64, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.USERS, databases.createStringAttribute, 'birthdate', 64, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.USERS, databases.createStringAttribute, 'interests', 64, false, undefined, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.USERS, databases.createStringAttribute, 'envPref', 32, false, 'both');
  await ensureAttribute(databases, dbId, COLLECTIONS.USERS, databases.createStringAttribute, 'pacePref', 32, false, 'both');
  await ensureAttribute(databases, dbId, COLLECTIONS.USERS, databases.createStringAttribute, 'aiProfile', 5000, false, '');

  // REVIEWS
  await ensureCollection(COLLECTIONS.REVIEWS, 'Reviews');
  await ensureAttribute(databases, dbId, COLLECTIONS.REVIEWS, databases.createStringAttribute, 'placeId', 128, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.REVIEWS, databases.createStringAttribute, 'uid', 64, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.REVIEWS, databases.createStringAttribute, 'author', 255, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.REVIEWS, databases.createStringAttribute, 'avatar', 1000, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.REVIEWS, databases.createIntegerAttribute, 'rating', true, 1, 5);
  await ensureAttribute(databases, dbId, COLLECTIONS.REVIEWS, databases.createStringAttribute, 'text', 5000, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.REVIEWS, databases.createStringAttribute, 'category', 64, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.REVIEWS, databases.createStringAttribute, 'photos', 1000, false, undefined, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.REVIEWS, databases.createStringAttribute, 'video', 1000, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.REVIEWS, databases.createIntegerAttribute, 'likeCount', false, 0, 1000000, 0);
  await ensureAttribute(databases, dbId, COLLECTIONS.REVIEWS, databases.createIntegerAttribute, 'commentCount', false, 0, 1000000, 0);
  await ensureAttribute(databases, dbId, COLLECTIONS.REVIEWS, databases.createStringAttribute, 'createdAt', 64, false, '');

  // REVIEW LIKES & COMMENTS
  await ensureCollection(COLLECTIONS.REVIEW_LIKES, 'Review Likes');
  await ensureAttribute(databases, dbId, COLLECTIONS.REVIEW_LIKES, databases.createStringAttribute, 'uid', 64, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.REVIEW_LIKES, databases.createStringAttribute, 'reviewId', 64, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.REVIEW_LIKES, databases.createStringAttribute, 'createdAt', 64, false, '');

  await ensureCollection(COLLECTIONS.REVIEW_COMMENTS, 'Review Comments');
  await ensureAttribute(databases, dbId, COLLECTIONS.REVIEW_COMMENTS, databases.createStringAttribute, 'reviewId', 64, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.REVIEW_COMMENTS, databases.createStringAttribute, 'uid', 64, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.REVIEW_COMMENTS, databases.createStringAttribute, 'author', 255, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.REVIEW_COMMENTS, databases.createStringAttribute, 'avatar', 1000, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.REVIEW_COMMENTS, databases.createStringAttribute, 'text', 2000, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.REVIEW_COMMENTS, databases.createStringAttribute, 'createdAt', 64, false, '');

  // EVENTS
  await ensureCollection(COLLECTIONS.EVENTS, 'Events');
  await ensureAttribute(databases, dbId, COLLECTIONS.EVENTS, databases.createStringAttribute, 'name', 255, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.EVENTS, databases.createStringAttribute, 'title', 255, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.EVENTS, databases.createStringAttribute, 'tag', 64, false, 'กิจกรรม');
  await ensureAttribute(databases, dbId, COLLECTIONS.EVENTS, databases.createStringAttribute, 'badge', 64, false, 'กิจกรรม');
  await ensureAttribute(databases, dbId, COLLECTIONS.EVENTS, databases.createStringAttribute, 'category', 64, false, 'festival');
  await ensureAttribute(databases, dbId, COLLECTIONS.EVENTS, databases.createStringAttribute, 'startDate', 64, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.EVENTS, databases.createStringAttribute, 'endDate', 64, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.EVENTS, databases.createStringAttribute, 'dates', 128, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.EVENTS, databases.createStringAttribute, 'location', 255, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.EVENTS, databases.createFloatAttribute, 'lat', false, -90, 90, 0);
  await ensureAttribute(databases, dbId, COLLECTIONS.EVENTS, databases.createFloatAttribute, 'lng', false, -180, 180, 0);
  await ensureAttribute(databases, dbId, COLLECTIONS.EVENTS, databases.createStringAttribute, 'img', 1000, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.EVENTS, databases.createStringAttribute, 'banner', 1000, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.EVENTS, databases.createStringAttribute, 'desc', 5000, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.EVENTS, databases.createStringAttribute, 'price', 64, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.EVENTS, databases.createStringAttribute, 'url', 1000, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.EVENTS, databases.createStringAttribute, 'ctaHref', 1000, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.EVENTS, databases.createBooleanAttribute, 'showAsPopup', false, false);
  await ensureAttribute(databases, dbId, COLLECTIONS.EVENTS, databases.createBooleanAttribute, 'active', false, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.EVENTS, databases.createStringAttribute, 'createdAt', 64, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.EVENTS, databases.createStringAttribute, 'updatedAt', 64, false, '');

  // ADS
  await ensureCollection(COLLECTIONS.ADS, 'Ads');
  await ensureAttribute(databases, dbId, COLLECTIONS.ADS, databases.createStringAttribute, 'title', 255, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.ADS, databases.createStringAttribute, 'imageUrl', 1000, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.ADS, databases.createStringAttribute, 'linkUrl', 1000, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.ADS, databases.createStringAttribute, 'placement', 64, false, 'home');
  await ensureAttribute(databases, dbId, COLLECTIONS.ADS, databases.createBooleanAttribute, 'isActive', false, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.ADS, databases.createStringAttribute, 'createdAt', 64, false, '');

  // FAVORITES
  await ensureCollection(COLLECTIONS.FAVORITES, 'Favorites');
  await ensureAttribute(databases, dbId, COLLECTIONS.FAVORITES, databases.createStringAttribute, 'uid', 64, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.FAVORITES, databases.createStringAttribute, 'placeId', 128, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.FAVORITES, databases.createStringAttribute, 'createdAt', 64, false, '');

  // LIFESTYLE INTERESTS
  await ensureCollection(COLLECTIONS.LIFESTYLE_INTERESTS, 'Lifestyle Interests');
  await ensureAttribute(databases, dbId, COLLECTIONS.LIFESTYLE_INTERESTS, databases.createStringAttribute, 'uid', 64, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.LIFESTYLE_INTERESTS, databases.createStringAttribute, 'category', 64, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.LIFESTYLE_INTERESTS, databases.createStringAttribute, 'createdAt', 64, false, '');

  // CHECKIN POSTS / LIKES / COMMENTS / NOTES
  await ensureCollection(COLLECTIONS.CHECKIN_POSTS, 'Checkin Posts');
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_POSTS, databases.createStringAttribute, 'uid', 64, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_POSTS, databases.createStringAttribute, 'author', 255, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_POSTS, databases.createStringAttribute, 'avatar', 1000, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_POSTS, databases.createStringAttribute, 'place', 255, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_POSTS, databases.createStringAttribute, 'placeId', 128, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_POSTS, databases.createStringAttribute, 'photos', 1000, false, undefined, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_POSTS, databases.createStringAttribute, 'video', 1000, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_POSTS, databases.createStringAttribute, 'hashtags', 64, false, undefined, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_POSTS, databases.createIntegerAttribute, 'rating', false, 0, 5, 0);
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_POSTS, databases.createStringAttribute, 'visibility', 32, false, 'public');
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_POSTS, databases.createStringAttribute, 'category', 64, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_POSTS, databases.createIntegerAttribute, 'likeCount', false, 0, 1000000, 0);
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_POSTS, databases.createIntegerAttribute, 'commentCount', false, 0, 1000000, 0);
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_POSTS, databases.createStringAttribute, 'createdAt', 64, false, '');

  await ensureCollection(COLLECTIONS.CHECKIN_LIKES, 'Checkin Likes');
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_LIKES, databases.createStringAttribute, 'uid', 64, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_LIKES, databases.createStringAttribute, 'postId', 64, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_LIKES, databases.createStringAttribute, 'createdAt', 64, false, '');

  await ensureCollection(COLLECTIONS.CHECKIN_COMMENTS, 'Checkin Comments');
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_COMMENTS, databases.createStringAttribute, 'postId', 64, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_COMMENTS, databases.createStringAttribute, 'uid', 64, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_COMMENTS, databases.createStringAttribute, 'author', 255, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_COMMENTS, databases.createStringAttribute, 'avatar', 1000, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_COMMENTS, databases.createStringAttribute, 'text', 2000, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_COMMENTS, databases.createStringAttribute, 'createdAt', 64, false, '');

  await ensureCollection(COLLECTIONS.CHECKIN_NOTES, 'Checkin Notes');
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_NOTES, databases.createStringAttribute, 'uid', 64, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_NOTES, databases.createStringAttribute, 'place', 255, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_NOTES, databases.createStringAttribute, 'title', 255, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_NOTES, databases.createStringAttribute, 'body', 5000, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.CHECKIN_NOTES, databases.createStringAttribute, 'createdAt', 64, false, '');

  // AUDIT LOGS
  await ensureCollection(COLLECTIONS.AUDIT_LOGS, 'Audit Logs');
  await ensureAttribute(databases, dbId, COLLECTIONS.AUDIT_LOGS, databases.createStringAttribute, 'action', 128, true);
  await ensureAttribute(databases, dbId, COLLECTIONS.AUDIT_LOGS, databases.createStringAttribute, 'actor', 255, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.AUDIT_LOGS, databases.createStringAttribute, 'target', 255, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.AUDIT_LOGS, databases.createStringAttribute, 'details', 5000, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.AUDIT_LOGS, databases.createStringAttribute, 'ip', 64, false, '');
  await ensureAttribute(databases, dbId, COLLECTIONS.AUDIT_LOGS, databases.createStringAttribute, 'createdAt', 64, false, '');

  console.log('\n⏳ Waiting for Appwrite attributes to become available (5 seconds)...');
  await sleep(5000);

  console.log('\nℹ Places collection ready (no mock places seeded - places will be created by admin user).');

  // 3. Seed Events
  const SEED_EVENTS = [
    {
      id: 'event-fireboat',
      title: 'งานประเพณีไหลเรือไฟและงานกาชาด ประจำปี 2569',
      name: 'งานประเพณีไหลเรือไฟและงานกาชาด ประจำปี 2569',
      tag: 'เทศกาลระดับโลก',
      badge: 'ไฮไลท์ประจำปี',
      category: 'festival',
      desc: 'สัมผัสความยิ่งใหญ่อลังการของเรือไฟยักษ์กลางลำน้ำโขง แสง สี เสียง และการแสดงวัฒนธรรมริมฝั่งโขงตลอด 11 วัน 11 คืน',
      startDate: '2026-10-24',
      endDate: '2026-11-03',
      dates: '24 ต.ค. – 3 พ.ย. 2569',
      location: 'ถนนสุนทรวิจิตร ริมฝั่งแม่น้ำโขง อำเภอเมืองนครพนม',
      lat: 17.4078,
      lng: 104.7801,
      banner: '/assets/images/events/event-fireboat.png',
      img: '/assets/images/events/event-fireboat.png',
      price: 'เข้าชมฟรี',
      showAsPopup: true,
      active: true,
      ctaHref: '/Fronend/pages/attractions.html',
    },
    {
      id: 'event-naga-worship',
      title: 'งานบวงสรวงพญาศรีสัตตนาคราช ประจำปี 2569',
      name: 'งานบวงสรวงพญาศรีสัตตนาคราช ประจำปี 2569',
      tag: 'พิธีกรรมศักดิ์สิทธิ์',
      badge: 'งานประเพณี',
      category: 'culture',
      desc: 'พิธีบวงสรวงองค์พญาศรีสัตตนาคราช 7 เศียรริมฝั่งโขง การรำบวงสรวงจากนางรำ 8 ชนเผ่า และตลาดวัฒนธรรม',
      startDate: '2026-07-07',
      endDate: '2026-07-13',
      dates: '7 – 13 ก.ค. 2569 (7 วัน 7 คืน)',
      location: 'ลานพญาศรีสัตตนาคราช อำเภอเมืองนครพนม',
      lat: 17.4058,
      lng: 104.7861,
      banner: '/assets/images/events/event-naga-worship.png',
      img: '/assets/images/events/event-naga-worship.png',
      price: 'เข้าชมฟรี',
      showAsPopup: false,
      active: true,
      ctaHref: '/Fronend/pages/attractions.html',
    },
    {
      id: 'event-songkran-mekong',
      title: 'เทศกาลสงกรานต์ นครพนม รื่นรมย์ ริมโขง',
      name: 'เทศกาลสงกรานต์ นครพนม รื่นรมย์ ริมโขง',
      tag: 'เทศกาลสงกรานต์',
      badge: 'สงกรานต์ริมโขง',
      category: 'festival',
      desc: 'เล่นน้ำสงกรานต์ถนนข้าวปุ้น ชมขบวนแห่พระพุทธรูปศักดิ์สิทธิ์ และอุโมงค์น้ำริมฝั่งแม่น้ำโขง',
      startDate: '2026-04-12',
      endDate: '2026-04-16',
      dates: '12 – 16 เม.ย. 2569',
      location: 'ถนนข้าวปุ้น ริมแม่น้ำโขง เทศบาลเมืองนครพนม',
      lat: 17.4015,
      lng: 104.7815,
      banner: '/assets/images/events/event-songkran.png',
      img: '/assets/images/events/event-songkran.png',
      price: 'เข้าชมฟรี',
      showAsPopup: false,
      active: true,
      ctaHref: '/Fronend/pages/attractions.html',
    }
  ];

  console.log('\n▶ Seeding initial events into Appwrite...');
  let eventCreated = 0, eventSkipped = 0;
  for (const ev of SEED_EVENTS) {
    const docIdSanitized = ev.id.slice(0, 36);
    try {
      await databases.getDocument(dbId, COLLECTIONS.EVENTS, docIdSanitized);
      eventSkipped++;
    } catch (err) {
      if (err.code === 404) {
        const payload = {
          name: ev.name,
          title: ev.title,
          tag: ev.tag,
          badge: ev.badge,
          category: ev.category,
          startDate: ev.startDate,
          endDate: ev.endDate,
          dates: ev.dates,
          location: ev.location,
          lat: Number(ev.lat) || 0,
          lng: Number(ev.lng) || 0,
          img: ev.img,
          banner: ev.banner,
          desc: ev.desc,
          price: ev.price,
          url: ev.ctaHref || '',
          ctaHref: ev.ctaHref || '',
          showAsPopup: ev.showAsPopup,
          active: ev.active,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await databases.createDocument(dbId, COLLECTIONS.EVENTS, docIdSanitized, payload);
        eventCreated++;
      } else {
        console.warn(`  ! Error checking event "${ev.id}":`, err.message);
      }
    }
  }
  console.log(`✔ Events seed complete! Created: ${eventCreated}, Skipped: ${eventSkipped}`);

  console.log('\n🎉 Appwrite database & collections initialization finished successfully!\n');
}

initAppwriteSchema().catch((err) => {
  console.error('\n❌ Appwrite initialization error:', err.message);
  process.exit(1);
});
