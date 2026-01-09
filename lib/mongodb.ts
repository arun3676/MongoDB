/**
 * MongoDB Atlas Connection Manager
 *
 * Provides connection pooling and database access for the fraud detection system.
 * Uses MongoDB Node.js driver with connection caching to avoid multiple connections.
 */

import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Missing MONGODB_URI in environment variables');
}

if (!process.env.MONGODB_DB_NAME) {
  throw new Error('Missing MONGODB_DB_NAME in environment variables');
}

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

// Connection options for production use
const options = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 10000, // 10 seconds
  socketTimeoutMS: 45000, // 45 seconds
};

// Global connection cache to avoid multiple connections in development
// This is safe because Next.js hot reloads modules but keeps global scope
interface GlobalWithMongo {
  _mongoClientPromise?: Promise<MongoClient>;
}

const globalWithMongo = global as GlobalWithMongo;

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development, use a global variable to preserve the connection
  // across hot reloads
  if (!globalWithMongo._mongoClientPromise) {
    const client = new MongoClient(MONGODB_URI, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production, create a new connection
  const client = new MongoClient(MONGODB_URI, options);
  clientPromise = client.connect();
}

/**
 * Get connected MongoDB client
 *
 * @returns Promise<MongoClient> - Connected MongoDB client
 */
export async function getClient(): Promise<MongoClient> {
  return clientPromise;
}

/**
 * Get database instance
 *
 * @returns Promise<Db> - MongoDB database instance
 */
export async function getDatabase(): Promise<Db> {
  const client = await getClient();
  return client.db(MONGODB_DB_NAME);
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
      database: MONGODB_DB_NAME,
      host: serverInfo.me,
    };
  } catch (error) {
    return {
      connected: false,
      database: MONGODB_DB_NAME,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Export database name for use in other modules
export const DB_NAME = MONGODB_DB_NAME;

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
} as const;
