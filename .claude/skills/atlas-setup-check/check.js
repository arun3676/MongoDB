#!/usr/bin/env node

/**
 * MongoDB Atlas Setup Check
 * Verifies connection, collections, and indexes
 */

const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  });
}

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'fraud_escalation';

const REQUIRED_COLLECTIONS = [
  'transactions',
  'agent_steps',
  'signals',
  'payments',
  'decisions',
  'policies'
];

async function checkAtlasSetup() {
  console.log('🔍 MongoDB Atlas Setup Check');
  console.log('━'.repeat(40));
  console.log('');

  // Check environment variables
  console.log('✅ Environment Variables');
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env.local');
    process.exit(2);
  }

  // Mask sensitive parts of URI
  const maskedUri = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  console.log(`   MONGODB_URI: ${maskedUri}`);
  console.log(`   MONGODB_DB_NAME: ${MONGODB_DB_NAME}`);
  console.log('');

  let client;
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB Atlas...');
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    await client.connect();

    const db = client.db(MONGODB_DB_NAME);

    console.log('✅ MongoDB Connection: OK');
    const admin = client.db('admin');
    const serverInfo = await admin.command({ hello: 1 });
    console.log(`   Database: ${MONGODB_DB_NAME}`);
    console.log('');

    // List collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    console.log(`✅ Collections: ${collectionNames.length}/${REQUIRED_COLLECTIONS.length} found`);

    let missingCollections = [];
    for (const reqCol of REQUIRED_COLLECTIONS) {
      if (collectionNames.includes(reqCol)) {
        console.log(`   ✓ ${reqCol}`);
      } else {
        console.log(`   ✗ ${reqCol} (MISSING)`);
        missingCollections.push(reqCol);
      }
    }
    console.log('');

    if (missingCollections.length > 0) {
      console.error(`❌ Missing collections: ${missingCollections.join(', ')}`);
      console.error('   Run orchestration-agent to create collections');
      await client.close();
      process.exit(3);
    }

    // Check indexes
    console.log('📊 Indexes:');
    let totalIndexes = 0;
    for (const colName of REQUIRED_COLLECTIONS) {
      const indexes = await db.collection(colName).indexes();
      console.log(`   ${colName}: ${indexes.length} indexes`);
      totalIndexes += indexes.length;
    }
    console.log(`   Total: ${totalIndexes} indexes`);
    console.log('');

    // Document counts
    console.log('📄 Document Counts:');
    for (const colName of REQUIRED_COLLECTIONS) {
      const count = await db.collection(colName).countDocuments();
      console.log(`   ${colName}: ${count}`);
    }
    console.log('');

    console.log('━'.repeat(40));
    console.log('✅ Atlas OK - Ready for fraud detection!');

    await client.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (client) await client.close();
    process.exit(1);
  }
}

checkAtlasSetup();
