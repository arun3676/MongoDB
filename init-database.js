/**
 * Database Initialization Script - WITH VECTOR SEARCH SUPPORT
 *
 * Creates all collections with indexes + embeddings for semantic search
 * Run this once to set up MongoDB Atlas
 *
 * Usage: node init-database.js
 *
 * ============================================================================
 * 🎯 SEMANTIC SEARCH CAPABILITY
 * ============================================================================
 * This script now generates VECTOR EMBEDDINGS using Voyage AI for:
 * 1. Tool metadata (enables semantic tool discovery)
 * 2. Policy descriptions (enables semantic policy matching)
 *
 * AFTER RUNNING THIS SCRIPT:
 * You MUST create Vector Search Indexes in MongoDB Atlas UI:
 *
 * FOR TOOL_METADATA COLLECTION:
 * 1. Go to MongoDB Atlas → Your Cluster → Search
 * 2. Click "Create Search Index"
 * 3. Choose "JSON Editor"
 * 4. Use this configuration:
 *
 * {
 *   "fields": [
 *     {
 *       "type": "vector",
 *       "path": "embedding",
 *       "numDimensions": 1024,
 *       "similarity": "cosine"
 *     }
 *   ]
 * }
 *
 * 5. Name: "vector_index"
 * 6. Collection: "tool_metadata"
 * 7. Click "Create Search Index" and wait 1-2 minutes
 *
 * REPEAT FOR POLICIES COLLECTION:
 * - Same configuration
 * - Name: "policies_vector_index"
 * - Collection: "policies"
 *
 * This enables agents to discover tools using natural language!
 * Example: "Find tools for detecting rapid spending patterns"
 * → Semantic search finds: Velocity Signal (by meaning, not keywords)
 * ============================================================================
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

// Import Voyage AI for embeddings
// Note: This uses the compiled JS from lib/voyage.ts
const { getMatryoshkaEmbedding } = require('./lib/voyage');

const COLLECTIONS = {
  TRANSACTIONS: 'transactions',
  AGENT_STEPS: 'agent_steps',
  SIGNALS: 'signals',
  PAYMENTS: 'payments',
  DECISIONS: 'decisions',
  POLICIES: 'policies',
  BUDGET: 'budget',
  TOOL_METADATA: 'tool_metadata',
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

    // Seed default policies WITH EMBEDDINGS
    console.log('\n📝 Seeding fraud detection policies WITH EMBEDDINGS...');
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

    // Generate embeddings for each policy
    console.log('  📊 Generating policy embeddings...');
    let embeddedPolicyCount = 0;

    for (const policy of defaultPolicies) {
      try {
        // Combine name + description for semantic search
        const textToEmbed = `${policy.name}. ${policy.description}. Rule type: ${policy.ruleType}`;

        // Generate 1024-dim embedding (full precision)
        const embedding = await getMatryoshkaEmbedding(textToEmbed, 1024);

        if (embedding) {
          policy.embedding = embedding;
          policy.embeddingMetadata = {
            model: 'voyage-3',
            dimensions: 1024,
            generatedAt: new Date(),
            textEmbedded: textToEmbed,
          };
          embeddedPolicyCount++;
          console.log(`    ✓ ${policy.name}: embedding generated`);
        } else {
          console.warn(`    ⚠ ${policy.name}: embedding failed, inserting without vector`);
        }
      } catch (error) {
        console.error(`    ❌ ${policy.name}: embedding error -`, error.message);
      }

      // Upsert policy (with or without embedding)
      await policiesCollection.updateOne(
        { policyId: policy.policyId },
        { $setOnInsert: policy },
        { upsert: true }
      );
    }

    console.log(`✅ Seeded ${defaultPolicies.length} policies (${embeddedPolicyCount} with embeddings)\n`);

    if (embeddedPolicyCount > 0) {
      console.log('📌 REMINDER: Create Vector Search Index in MongoDB Atlas:');
      console.log('   Collection: policies');
      console.log('   Index Name: policies_vector_index');
      console.log('   Field: embedding, Dimensions: 1024, Similarity: cosine\n');
    }

    // Seed tool metadata WITH EMBEDDINGS (for x402 Bazaar discovery)
    console.log('🛠️  Seeding tool metadata WITH EMBEDDINGS...');
    const toolsCollection = db.collection(COLLECTIONS.TOOL_METADATA);

    const toolMetadata = [
      {
        toolId: 'tool_velocity_001',
        name: 'Velocity Signal',
        category: 'fraud_detection',
        description: 'Transaction velocity and burst detection - analyzes user spending patterns over time',
        endpoint: '/api/signals/velocity',
        method: 'GET',
        price: 0.10,
        currency: 'USD',
        capabilities: ['transaction_history', 'burst_detection', 'account_age', 'velocity_scoring'],
        requiredParams: ['userId', 'transactionId'],
        provider: 'FraudSignals Inc',
        enabled: true,
        lastUsed: null,
        usageCount: 0,
        avgResponseTime: 250,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        toolId: 'tool_network_001',
        name: 'Network Risk Signal',
        category: 'fraud_detection',
        description: 'Graph analysis of user connections and fraud rings - detects suspicious network patterns',
        endpoint: '/api/signals/network',
        method: 'GET',
        price: 0.25,
        currency: 'USD',
        capabilities: ['graph_analysis', 'device_sharing', 'fraud_rings', 'connection_scoring'],
        requiredParams: ['userId', 'transactionId'],
        provider: 'NetworkGuard AI',
        enabled: true,
        lastUsed: null,
        usageCount: 0,
        avgResponseTime: 450,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Generate embeddings for each tool
    console.log('  📊 Generating tool embeddings...');
    let embeddedToolCount = 0;

    for (const tool of toolMetadata) {
      try {
        // Combine name, description, and capabilities for rich semantic search
        const textToEmbed = `${tool.name}. ${tool.description}. Capabilities: ${tool.capabilities.join(', ')}`;

        // Generate 1024-dim embedding (full precision for tool discovery)
        const embedding = await getMatryoshkaEmbedding(textToEmbed, 1024);

        if (embedding) {
          tool.embedding = embedding;
          tool.embeddingMetadata = {
            model: 'voyage-3',
            dimensions: 1024,
            generatedAt: new Date(),
            textEmbedded: textToEmbed,
          };
          embeddedToolCount++;
          console.log(`    ✓ ${tool.name}: embedding generated`);
        } else {
          console.warn(`    ⚠ ${tool.name}: embedding failed, inserting without vector`);
        }
      } catch (error) {
        console.error(`    ❌ ${tool.name}: embedding error -`, error.message);
      }

      // Upsert tool (with or without embedding)
      await toolsCollection.updateOne(
        { toolId: tool.toolId },
        { $setOnInsert: tool },
        { upsert: true }
      );
    }

    console.log(`✅ Seeded ${toolMetadata.length} tools (${embeddedToolCount} with embeddings)\n`);

    if (embeddedToolCount > 0) {
      console.log('📌 IMPORTANT: Create Vector Search Index in MongoDB Atlas UI:');
      console.log('   1. Go to: MongoDB Atlas → Your Cluster → Search');
      console.log('   2. Click "Create Search Index"');
      console.log('   3. Choose "JSON Editor"');
      console.log('   4. Configuration:');
      console.log('      {');
      console.log('        "fields": [');
      console.log('          {');
      console.log('            "type": "vector",');
      console.log('            "path": "embedding",');
      console.log('            "numDimensions": 1024,');
      console.log('            "similarity": "cosine"');
      console.log('          }');
      console.log('        ]');
      console.log('      }');
      console.log('   5. Index Name: vector_index');
      console.log('   6. Collection: tool_metadata');
      console.log('   7. Click "Create Search Index" and wait 1-2 minutes');
      console.log('\n  🎯 This enables SEMANTIC TOOL DISCOVERY!');
      console.log('     Agents can find tools using natural language.\n');
    }

    console.log('🎉 Database initialization complete!\n');
    console.log('📊 Summary:');
    console.log(`   - 8 collections created (transactions, agent_steps, signals, payments, decisions, policies, budget, tool_metadata)`);
    console.log(`   - 25+ indexes created`);
    console.log(`   - ${defaultPolicies.length} fraud policies seeded (${embeddedPolicyCount} with vector embeddings)`);
    console.log(`   - ${toolMetadata.length} tools seeded (${embeddedToolCount} with vector embeddings)`);
    console.log(`   - TTL index on signals (auto-cleanup after 1 hour)`);
    console.log('\n🎯 SEMANTIC SEARCH ENABLED:');
    console.log(`   - ${embeddedPolicyCount + embeddedToolCount} total embeddings generated`);
    console.log(`   - Agents can discover tools using natural language`);
    console.log(`   - Policy matching via semantic similarity\n`);
    console.log('✅ System ready for agent workflow!\n');

  } catch (error) {
    console.error('\n❌ Initialization failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

initializeDatabase();
