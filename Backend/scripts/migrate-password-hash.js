/**
 * migrate-password-hash.js
 * ─────────────────────────────────────────────────────────────────
 * One-time migration script: syncs passwordHash from local devStore
 * (.devdata/auth_users.json) into Appwrite Database.
 *
 * Run:  node scripts/migrate-password-hash.js
 * ─────────────────────────────────────────────────────────────────
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const devStore = require('../utils/devStore');
const { getDatabases, isAppwriteReady, databaseId, COLLECTIONS, Query } = require('../config/database');

async function findAppwriteDocByUid(uid, email) {
  const db = getDatabases();

  // 1. Try by uid field
  try {
    const res = await db.listDocuments(databaseId, COLLECTIONS.USERS, [
      Query.equal('uid', String(uid)),
      Query.limit(1),
    ]);
    if (res.documents.length > 0) return res.documents[0];
  } catch {}

  // 2. Try by email field
  if (email) {
    try {
      const res = await db.listDocuments(databaseId, COLLECTIONS.USERS, [
        Query.equal('email', String(email)),
        Query.limit(1),
      ]);
      if (res.documents.length > 0) return res.documents[0];
    } catch {}
  }

  return null;
}

async function run() {
  console.log('\n🔄 Migrate passwordHash → Appwrite Database');
  console.log('===========================================');

  if (!isAppwriteReady()) {
    console.log('⚠️  Appwrite ยังไม่ได้ตั้งค่า — ไม่มีอะไรต้อง migrate');
    console.log('   (ระบบใช้ devStore แทน ซึ่งมี hash อยู่แล้ว)');
    process.exit(0);
  }

  const allUsers = devStore.readAll('auth_users');
  const entries = Object.entries(allUsers);
  console.log(`📋 พบ ${entries.length} user ใน devStore\n`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const [uid, userData] of entries) {
    const email = userData.email || '(ไม่มีอีเมล)';
    const hash = userData.passwordHash;

    if (!hash) {
      console.log(`  ⏭  ${email} — ไม่มี passwordHash (provider: ${userData.provider || 'unknown'}) — ข้าม`);
      skipped++;
      continue;
    }

    // Check if already has passwordHash in Appwrite
    const doc = await findAppwriteDocByUid(uid, userData.email);
    if (!doc) {
      console.log(`  ⚠️  ${email} — ไม่พบ document ใน Appwrite เลย (uid: ${uid})`);
      failed++;
      continue;
    }

    if (doc.passwordHash) {
      console.log(`  ✅ ${email} — มี passwordHash อยู่แล้วใน Appwrite — ข้าม`);
      skipped++;
      continue;
    }

    try {
      await getDatabases().updateDocument(databaseId, COLLECTIONS.USERS, doc.$id, {
        passwordHash: hash,
      });
      console.log(`  ✅ ${email} — sync สำเร็จ (doc: ${doc.$id})`);
      migrated++;
    } catch (err) {
      console.log(`  ❌ ${email} — update error: ${err.message}`);
      failed++;
    }
  }

  console.log('\n📊 สรุปผล:');
  console.log(`   ✅ Migrated : ${migrated}`);
  console.log(`   ⏭  Skipped  : ${skipped}`);
  console.log(`   ❌ Failed   : ${failed}`);
  if (failed > 0) {
    console.log('\n⚠️  บาง user ไม่สามารถ migrate ได้ — อาจต้องตรวจสอบ Appwrite Collection ว่ามี field "passwordHash" หรือไม่');
    console.log('   ไปที่ Appwrite Console → Database → users collection → เพิ่ม attribute "passwordHash" (String, optional)');
  }
  console.log('\n✨ Migration เสร็จสิ้น');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
