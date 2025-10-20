/**
 * Featured Properties Cleanup
 *
 * Schedules: Run daily (e.g., via cron) to expire featured entries older than 30 days.
 * Usage: node scripts/cleanup-featured-properties.js
 */

const admin = require('firebase-admin');

try {
  const serviceAccount = require('../serviceAccountKey.json');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  console.log('\nSetup steps:');
  console.log('1. Download a service account key from Firebase Console');
  console.log('2. Save it as serviceAccountKey.json in the project root');
  process.exit(1);
}

const db = admin.firestore();
const { FieldValue, Timestamp } = admin.firestore;

async function cleanupFeaturedProperties() {
  console.log('\n🧹 Running featured properties cleanup...');

  const now = Timestamp.now();
  const snapshot = await db.collection('featured_properties').get();

  if (snapshot.empty) {
    console.log('📭 No featured properties found.');
    return;
  }

  let updated = 0;
  const batch = db.batch();

  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.endDate) {
      return;
    }

    const endDate = data.endDate instanceof Timestamp ? data.endDate : Timestamp.fromDate(new Date(data.endDate));

    if (endDate.toMillis() <= now.toMillis() && data.status !== 'expired') {
      batch.update(doc.ref, {
        status: 'expired',
        updatedAt: FieldValue.serverTimestamp(),
      });
      updated += 1;
      console.log(`  ⏳ Expiring featured property ${doc.id}`);
    }
  });

  if (updated === 0) {
    console.log('✨ All featured properties are within their active window.');
    return;
  }

  await batch.commit();
  console.log(`✅ Cleanup complete. Marked ${updated} featured propert${updated === 1 ? 'y' : 'ies'} as expired.`);
}

cleanupFeaturedProperties()
  .then(() => {
    console.log('\n🏁 Featured properties cleanup finished.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });
