/**
 * MongoDB Atlas Connection Manager
 *
 * Provides connection pooling and database access for the fraud detection system.
 * Uses MongoDB Node.js driver with connection caching to avoid multiple connections.
 */

import { MongoClient, Db } from 'mongodb';

// Lazy getters for environment variables (validated at runtime, not import time)
function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Missing MONGODB_URI in environment variables');
  }
  return uri;
}

function getMongoDbName(): string {
  const dbName = process.env.MONGODB_DB_NAME;
  if (!dbName) {
    throw new Error('Missing MONGODB_DB_NAME in environment variables');
  }
  return dbName;
}

// Build connection URI with SSL parameters (called at runtime)
function getConnectionUri(): string {
  const mongoUri = getMongoUri();
  if (!mongoUri.includes('ssl=')) {
    return mongoUri + (mongoUri.includes('?') ? '&' : '?') + 'ssl=true&tlsAllowInvalidCertificates=false';
  }
  return mongoUri;
}

// Connection options for production use
const options = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 10000, // 10 seconds
  socketTimeoutMS: 45000, // 45 seconds
  tls: true,
  // SSL settings for compatibility
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
  // Add retry options for better resilience
  maxIdleTimeMS: 30000,
};

// Global connection cache to avoid multiple connections in development
// This is safe because Next.js hot reloads modules but keeps global scope
interface GlobalWithMongo {
  _mongoClientPromise?: Promise<MongoClient>;
}

const globalWithMongo = global as GlobalWithMongo;

let clientPromise: Promise<MongoClient> | undefined;

/**
 * Get connected MongoDB client (lazy connection - only connects when called)
 *
 * This function is idempotent - safe to call multiple times.
 * Connection is cached after first call.
 *
 * @returns Promise<MongoClient> - Connected MongoDB client
 */
export async function getClient(): Promise<MongoClient> {
  // Lazy initialization: only create connection when actually needed
  const connectionUri = getConnectionUri(); // Get URI at runtime
  
  if (process.env.NODE_ENV === 'development') {
    // In development, use a global variable to preserve the connection
    // across hot reloads
    if (!globalWithMongo._mongoClientPromise) {
      const client = new MongoClient(connectionUri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    return globalWithMongo._mongoClientPromise;
  } else {
    // In production, cache the connection promise (lazy initialization)
    if (!clientPromise) {
      const client = new MongoClient(connectionUri, options);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

/**
 * Get database instance
 *
 * @returns Promise<Db> - MongoDB database instance
 */
export async function getDatabase(): Promise<Db> {
  const client = await getClient();
  return client.db(getMongoDbName()); // Get DB name at runtime
}

/**
 * Test MongoDB connection
 *
 * @returns Promise<boolean> - True if connection successful
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = await getClient();
    await client.db('admin').command({ ping: 1 });
    return true;
  } catch (error) {
    console.error('MongoDB connection test failed:', error);
    return false;
  }
}

/**
 * Get database connection info
 *
 * @returns Promise<object> - Database name and connection status
 */
export async function getConnectionInfo() {
  try {
    const client = await getClient();
    const admin = client.db('admin');
    const serverInfo = await admin.command({ hello: 1 });

    return {
      connected: true,
      database: getMongoDbName(), // Get DB name at runtime
      host: serverInfo.me,
    };
  } catch (error) {
    return {
      connected: false,
      database: process.env.MONGODB_DB_NAME || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Collection names (centralized for consistency)
export const COLLECTIONS = {
  TRANSACTIONS: 'transactions',
  AGENT_STEPS: 'agent_steps',
  SIGNALS: 'signals',
  PAYMENTS: 'payments',
  DECISIONS: 'decisions',
  POLICIES: 'policies',
  BUDGET: 'budget',
  TOOL_METADATA: 'tool_metadata',
  VERIFICATION_SESSIONS: 'verification_sessions',
  VERIFICATIONS: 'verifications',
  MARKETPLACE_ORDERS: 'marketplace_orders',
} as const;
