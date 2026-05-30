import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Firebase Admin
let serviceAccount;
try {
  const serviceAccountPath = path.resolve('./firebase-service-account.json');
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} catch (error) {
  console.error("Failed to load firebase-service-account.json. Please make sure it exists in the root directory.");
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function migrateData() {
  console.log("🚀 Starting Migration from Firebase to Supabase...");

  try {
    // 1. Migrate Users
    console.log("Migrating users...");
    const usersSnapshot = await db.collection('users').get();
    
    for (const doc of usersSnapshot.docs) {
      const email = doc.id; // user document ID is email
      const userData = doc.data();

      // Insert User
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          email: email,
          profile: userData.profile || {},
          initialBalances: userData.initialBalances || { 'default': 10000 },
          targetRR: userData.targetRR || 20,
          accounts: userData.accounts || [{ id: 'default', name: 'Main Account' }],
          status: userData.status || 'pending',
          isVip: userData.isVip || false,
        });

      if (userError) {
        console.error(`Error migrating user ${email}:`, userError);
        continue;
      }

      console.log(`✅ Migrated user config: ${email}`);

      // Migrate Subcollections for this user
      await migrateSubcollection(email, 'trades');
      await migrateSubcollection(email, 'plans');
      await migrateSubcollection(email, 'feedPosts', 'feed_posts');
      await migrateSubcollection(email, 'dividends');
      await migrateSubcollection(email, 'fundingHistory', 'funding_history');
    }

    // 2. Migrate Global Feed Posts
    console.log("Migrating Global Feed Posts...");
    const globalFeedSnapshot = await db.collection('globalFeedPosts').get();
    let globalFeedCount = 0;
    
    for (const doc of globalFeedSnapshot.docs) {
      const { error } = await supabase
        .from('global_feed_posts')
        .upsert({
          id: doc.id,
          data: doc.data()
        });
        
      if (error) console.error(`Error migrating global post ${doc.id}:`, error);
      else globalFeedCount++;
    }
    console.log(`✅ Migrated ${globalFeedCount} Global Feed Posts`);

    console.log("🎉 MIGRATION COMPLETE! 🎉");
    process.exit(0);

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

async function migrateSubcollection(email, firestoreCollectionName, supabaseTableName = firestoreCollectionName) {
  const snapshot = await db.collection('users').doc(email).collection(firestoreCollectionName).get();
  let count = 0;

  for (const doc of snapshot.docs) {
    const { error } = await supabase
      .from(supabaseTableName)
      .upsert({
        id: doc.id,
        email: email,
        data: doc.data()
      });

    if (error) {
      console.error(`Error migrating ${firestoreCollectionName} ${doc.id} for ${email}:`, error);
    } else {
      count++;
    }
  }

  if (count > 0) {
    console.log(`   -> Migrated ${count} ${firestoreCollectionName}`);
  }
}

migrateData();
