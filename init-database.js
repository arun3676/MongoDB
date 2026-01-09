/**
 * Database Initialization Script
 *
 * Creates all 6 collections with indexes
 * Run this once to set up MongoDB Atlas
 *
 * Usage: node init-database.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const COLLECTIONS = {
  TRANSACTIONS: 'transactions',
  AGENT_STEPS: 'agent_steps',
  SIGNALS: 'signals',
  PAYMENTS: 'payments',
  DECISIONS: 'decisions',
  POLICIES: 'policies',
};

async function initializeDatabase() {
  console.log('\n🚀 Initializing MongoDB Atlas Database...\n');

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);

    console.log('✅ Connected to MongoDB Atlas');
    console.log(`📦 Database: ${process.env.MONGODB_DB_NAME}\n`);

    // Create collections and indexes
    const collections = [
      {
        name: COLLECTIONS.TRANSACTIONS,
        indexes: [
          { key: { transactionId: 1 }, unique: true },
          { key: { userId: 1 } },
          { key: { status: 1 } },
          { key: { createdAt: -1 } },
        ],
      },
      {
        name: COLLECTIONS.AGENT_STEPS,
        indexes: [
          { key: { transactionId: 1, stepNumber: 1 }, unique: true },
          { key: { agentName: 1 } },
          { key: { timestamp: -1 } },
        ],
      },
      {
        name: COLLECTIONS.SIGNALS,
        indexes: [
          { key: { transactionId: 1, signalType: 1 }, unique: true },
          { key: { signalType: 1 } },
          { key: { purchasedAt: -1 } },
          { key: { expiresAt: 1 }, expireAfterSeconds: 0 }, // TTL index
        ],
      },
      {
        name: COLLECTIONS.PAYMENTS,
        indexes: [
          { key: { paymentId: 1 }, unique: true },
          { key: { transactionId: 1 } },
          { key: { 'x402Details.paymentProof': 1 } },
        ],
      },
      {
        name: COLLECTIONS.DECISIONS,
        indexes: [
          { key: { transactionId: 1, agentName: 1 }, unique: true },
          { key: { decision: 1 } },
          { key: { timestamp: -1 } },
          { key: { confidence: -1 } },
        ],
      },
      {
        name: COLLECTIONS.POLICIES,
        indexes: [
          { key: { policyId: 1 }, unique: true },
          { key: { active: 1 } },
        ],
      },
    ];

    for (const collectionConfig of collections) {
      const { name, indexes } = collectionConfig;

      // Create collection if it doesn't exist
      const existingCollections = await db.listCollections({ name }).toArray();

      if (existingCollections.length === 0) {
        await db.createCollection(name);
        console.log(`✅ Created collection: ${name}`);
      } else {
        console.log(`ℹ️  Collection exists: ${name}`);
      }

      // Create indexes
      const collection = db.collection(name);
      for (const index of indexes) {
        const options = {};
        if (index.unique) options.unique = true;
        if (index.expireAfterSeconds !== undefined) {
          options.expireAfterSeconds = index.expireAfterSeconds;
        }
        await collection.createIndex(index.key, options);
      }
      console.log(`   └─ Created ${indexes.length} indexes`);
    }

    // Seed default policies
    console.log('\n📝 Seeding default fraud detection policies...');
    const policiesCollection = db.collection(COLLECTIONS.POLICIES);

    const defaultPolicies = [
      {
        policyId: 'policy_velocity_high',
        name: 'High Velocity Detection',
        description: 'Flag transactions with velocity score > 0.8',
        ruleType: 'velocity',
        threshold: 0.8,
        action: 'FLAG',
        active: true,
        createdAt: new Date(),
      },
      {
        policyId: 'policy_network_fraud_ring',
        name: 'Fraud Network Detection',
        description: 'Flag users connected to known fraud networks',
        ruleType: 'network',
        threshold: 0.7,
        action: 'FLAG',
        active: true,
        createdAt: new Date(),
      },
      {
        policyId: 'policy_high_amount_new_user',
        name: 'High Amount New User',
        description: 'Flag transactions > $10,000 from accounts < 7 days old',
        ruleType: 'composite',
        threshold: 10000,
        action: 'FLAG',
        active: true,
        createdAt: new Date(),
      },
      {
        policyId: 'policy_multiple_red_flags',
        name: 'Multiple Risk Factors',
        description: 'Escalate to L2 if 3+ risk factors detected',
        ruleType: 'composite',
        threshold: 3,
        action: 'ESCALATE',
        active: true,
        createdAt: new Date(),
      },
    ];

    for (const policy of defaultPolicies) {
      await policiesCollection.updateOne(
        { policyId: policy.policyId },
        { $setOnInsert: policy },
        { upsert: true }
      );
    }

    console.log(`✅ Seeded ${defaultPolicies.length} policies\n`);

    console.log('🎉 Database initialization complete!\n');
    console.log('📊 Summary:');
    console.log(`   - 6 collections created`);
    console.log(`   - 20+ indexes created`);
    console.log(`   - 4 fraud policies seeded`);
    console.log(`   - TTL index on signals (auto-cleanup after 1 hour)`);
    console.log('\n✅ System ready for agent workflow!\n');

  } catch (error) {
    console.error('\n❌ Initialization failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

initializeDatabase();
