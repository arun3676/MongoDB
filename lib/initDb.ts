/**
 * Database Initialization
 *
 * Creates collections and indexes for the fraud detection system.
 * Safe to call multiple times - only creates if missing.
 */

import { Db, Collection } from 'mongodb';
import { getDatabase, COLLECTIONS } from './mongodb';

// Track initialization state to avoid redundant calls
let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize database schema (collections + indexes)
 *
 * This function is idempotent - safe to call multiple times.
 * Uses a promise to ensure only one initialization happens even
 * if called concurrently.
 *
 * @returns Promise<void>
 */
export async function initializeDatabase(): Promise<void> {
  // If already initialized, return immediately
  if (isInitialized) {
    return;
  }

  // If initialization is in progress, wait for it
  if (initPromise) {
    return initPromise;
  }

  // Start initialization
  initPromise = performInitialization();

  try {
    await initPromise;
    isInitialized = true;
  } finally {
    initPromise = null;
  }
}

/**
 * Perform the actual initialization work
 */
async function performInitialization(): Promise<void> {
  console.log('🔧 Initializing MongoDB schema...');

  const db = await getDatabase();

  // Create collections if they don't exist
  await ensureCollections(db);

  // Create indexes
  await createIndexes(db);

  // Seed initial policies if empty
  await seedPolicies(db);

  // Seed tool metadata for discovery
  await seedToolMetadata(db);

  console.log('✅ MongoDB schema initialized successfully');
}

/**
 * Ensure all required collections exist
 */
async function ensureCollections(db: Db): Promise<void> {
  const existingCollections = await db.listCollections().toArray();
  const existingNames = existingCollections.map(c => c.name);

  const requiredCollections = Object.values(COLLECTIONS);

  for (const collectionName of requiredCollections) {
    if (!existingNames.includes(collectionName)) {
      await db.createCollection(collectionName);
      console.log(`  ✓ Created collection: ${collectionName}`);
    }
  }
}

/**
 * Create indexes on all collections
 * Uses try-catch to handle existing indexes with different names
 */
async function createIndexes(db: Db): Promise<void> {
  console.log('  Creating indexes...');

  // Helper to create indexes safely (ignores "index already exists" errors)
  async function safeCreateIndexes(collection: Collection, indexes: Array<{ key: Record<string, number>; name: string; unique?: boolean; expireAfterSeconds?: number }>) {
    for (const index of indexes) {
      try {
        // Build options object, only including defined values
        const options: { name: string; unique?: boolean; expireAfterSeconds?: number } = {
          name: index.name,
        };
        if (index.unique === true) {
          options.unique = true;
        }
        if (index.expireAfterSeconds !== undefined) {
          options.expireAfterSeconds = index.expireAfterSeconds;
        }
        await collection.createIndex(index.key, options);
      } catch (error: unknown) {
        // Ignore known index errors:
        // - Code 85/86: Index already exists with different options
        // - Code 11000: Duplicate key error (existing data conflicts with unique index)
        const mongoError = error as { code?: number; codeName?: string };
        if (mongoError.code === 85 || mongoError.code === 86 ||
            mongoError.codeName === 'IndexOptionsConflict' ||
            mongoError.codeName === 'IndexKeySpecsConflict') {
          console.log(`    ⚠ Index ${index.name} already exists (skipped)`);
        } else if (mongoError.code === 11000 || mongoError.codeName === 'DuplicateKey') {
          console.log(`    ⚠ Index ${index.name} has duplicate key conflicts in existing data (skipped)`);
        } else {
          throw error;
        }
      }
    }
  }

  // Transactions collection indexes
  await safeCreateIndexes(db.collection(COLLECTIONS.TRANSACTIONS), [
    { key: { transactionId: 1 }, name: 'transactionId_unique', unique: true },
    { key: { status: 1, createdAt: -1 }, name: 'status_createdAt' },
    { key: { userId: 1, createdAt: -1 }, name: 'userId_createdAt' },
    { key: { status: 1, currentAgent: 1, createdAt: -1 }, name: 'status_agent_createdAt' },
  ]);

  // Agent steps collection indexes
  await safeCreateIndexes(db.collection(COLLECTIONS.AGENT_STEPS), [
    { key: { transactionId: 1, stepNumber: 1 }, name: 'transactionId_stepNumber' },
    { key: { agent: 1, timestamp: -1 }, name: 'agent_timestamp' },
    { key: { action: 1, timestamp: -1 }, name: 'action_timestamp' },
  ]);

  // Signals collection indexes (with TTL)
  await safeCreateIndexes(db.collection(COLLECTIONS.SIGNALS), [
    { key: { signalId: 1 }, name: 'signalId_unique', unique: true },
    { key: { transactionId: 1, purchasedAt: 1 }, name: 'transactionId_purchasedAt' },
    { key: { signalType: 1, purchasedAt: -1 }, name: 'signalType_purchasedAt' },
    { key: { expiresAt: 1 }, name: 'expiresAt_ttl', expireAfterSeconds: 0 },
  ]);

  // Payments collection indexes
  await safeCreateIndexes(db.collection(COLLECTIONS.PAYMENTS), [
    { key: { paymentId: 1 }, name: 'paymentId_unique', unique: true },
    { key: { transactionId: 1, createdAt: 1 }, name: 'transactionId_createdAt' },
    { key: { status: 1, createdAt: -1 }, name: 'status_createdAt' },
  ]);

  // Decisions collection indexes
  await safeCreateIndexes(db.collection(COLLECTIONS.DECISIONS), [
    { key: { decisionId: 1 }, name: 'decisionId_unique', unique: true },
    { key: { transactionId: 1, timestamp: 1 }, name: 'transactionId_timestamp' },
    { key: { agent: 1, timestamp: -1 }, name: 'agent_timestamp' },
    { key: { isFinal: 1, timestamp: -1 }, name: 'isFinal_timestamp' },
  ]);

  // Policies collection indexes
  await safeCreateIndexes(db.collection(COLLECTIONS.POLICIES), [
    { key: { policyId: 1 }, name: 'policyId_unique', unique: true },
    { key: { enabled: 1, type: 1 }, name: 'enabled_type' },
  ]);

  // Budget collection indexes
  await safeCreateIndexes(db.collection(COLLECTIONS.BUDGET), [
    { key: { transactionId: 1 }, name: 'transactionId_idx' },
    { key: { runId: 1 }, name: 'runId_idx' },
  ]);

  // Tool metadata collection indexes
  await safeCreateIndexes(db.collection(COLLECTIONS.TOOL_METADATA), [
    { key: { category: 1, enabled: 1 }, name: 'category_enabled' },
    { key: { price: 1 }, name: 'price_idx' },
  ]);

  console.log('  ✓ Indexes created');
}

/**
 * Seed initial fraud detection policies
 */
async function seedPolicies(db: Db): Promise<void> {
  const policiesCollection = db.collection(COLLECTIONS.POLICIES);
  const count = await policiesCollection.countDocuments();

  if (count === 0) {
    console.log('  Seeding initial policies...');

    const policies = [
      {
        policyId: 'pol_velocity_threshold',
        name: 'Velocity Threshold Policy',
        description: 'Triggers when user transaction velocity exceeds normal patterns',
        type: 'velocity',
        enabled: true,
        thresholds: {
          velocityScore: { low: 0.5, medium: 0.7, high: 0.85 },
          txCount24h: { low: 10, medium: 15, high: 25 },
        },
        actions: {
          low: 'LOG',
          medium: 'REQUIRE_L1',
          high: 'ESCALATE_TO_L2',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      },
      {
        policyId: 'pol_network_risk',
        name: 'Network Risk Policy',
        description: 'Evaluates connections to known fraudulent accounts',
        type: 'network',
        enabled: true,
        thresholds: {
          networkRiskScore: { low: 0.3, medium: 0.6, high: 0.8 },
          suspiciousConnections: { low: 1, medium: 2, high: 5 },
        },
        actions: {
          low: 'LOG',
          medium: 'ESCALATE_TO_L2',
          high: 'AUTO_DENY',
        },
        requiresSignal: 'network',
        signalCost: 0.25,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      },
      {
        policyId: 'pol_amount_threshold',
        name: 'Transaction Amount Policy',
        description: 'Flags transactions significantly above user average',
        type: 'amount',
        enabled: true,
        thresholds: {
          amountVsAvgMultiplier: { low: 2.0, medium: 3.0, high: 5.0 },
          absoluteAmount: { low: 500, medium: 1000, high: 2500 },
        },
        actions: {
          low: 'REQUIRE_L1',
          medium: 'ESCALATE_TO_L2',
          high: 'ESCALATE_TO_FINAL',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      },
      {
        policyId: 'pol_signal_purchase_rules',
        name: 'Signal Purchase Authorization',
        description: 'Defines when agents can purchase signals and cost limits',
        type: 'signal_authorization',
        enabled: true,
        rules: {
          L1_Analyst: {
            maxSignalCost: 0.15,
            allowedSignals: ['velocity'],
            requireApproval: false,
          },
          L2_Analyst: {
            maxSignalCost: 0.50,
            allowedSignals: ['velocity', 'network'],
            requireApproval: false,
          },
          Final_Reviewer: {
            maxSignalCost: 0.0,
            allowedSignals: [],
            requireApproval: true,
            canReadExisting: true,
          },
        },
        globalLimits: {
          maxTotalCostPerCase: 1.0,
          maxSignalsPerCase: 5,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      },
    ];

    await policiesCollection.insertMany(policies);
    console.log(`  ✓ Seeded ${policies.length} policies`);
  }
}

/**
 * Seed tool metadata for x402 Bazaar discovery
 */
async function seedToolMetadata(db: Db): Promise<void> {
  const toolsCollection = db.collection(COLLECTIONS.TOOL_METADATA);
  const count = await toolsCollection.countDocuments();

  if (count === 0) {
    console.log('  Seeding tool metadata...');

    const tools = [
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
        avgResponseTime: 250, // milliseconds
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
        avgResponseTime: 450, // milliseconds
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await toolsCollection.insertMany(tools);
    console.log(`  ✓ Seeded ${tools.length} tools`);
  }
}

/**
 * Reset initialization state (for testing)
 */
export function resetInitialization(): void {
  isInitialized = false;
  initPromise = null;
}

/**
 * Check if database is initialized
 */
export function isDatabaseInitialized(): boolean {
  return isInitialized;
}
