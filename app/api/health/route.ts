/**
 * Health Check Endpoint
 *
 * Verifies MongoDB Atlas connection and database initialization.
 * Safe to call repeatedly - returns current status.
 */

import { NextResponse } from 'next/server';
import { getConnectionInfo, COLLECTIONS } from '@/lib/mongodb';
import { initializeDatabase, isDatabaseInitialized } from '@/lib/initDb';

export const dynamic = 'force-dynamic'; // Disable caching

export async function GET() {
  try {
    // Initialize database (idempotent - safe to call multiple times)
    await initializeDatabase();

    // Get connection info
    const connectionInfo = await getConnectionInfo();

    if (!connectionInfo.connected) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'MongoDB connection failed',
          error: connectionInfo.error,
        },
        { status: 503 }
      );
    }

    // Return health check response
    return NextResponse.json({
      status: 'ok',
      message: 'Fraud detection system is healthy',
      database: {
        connected: true,
        name: connectionInfo.database,
        host: connectionInfo.host,
        initialized: isDatabaseInitialized(),
      },
      collections: Object.values(COLLECTIONS),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
