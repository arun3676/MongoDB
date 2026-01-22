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
    // Check for required environment variables first
    const missingVars: string[] = [];
    if (!process.env.MONGODB_URI) missingVars.push('MONGODB_URI');
    if (!process.env.MONGODB_DB_NAME) missingVars.push('MONGODB_DB_NAME');
    if (!process.env.FIREWORKS_API_KEY) missingVars.push('FIREWORKS_API_KEY');

    if (missingVars.length > 0) {
      console.error('[Health] Missing env vars:', missingVars);
      return NextResponse.json(
        {
          status: 'error',
          message: 'Missing required environment variables',
          missing: missingVars,
          hint: 'Please configure environment variables in Railway dashboard',
        },
        { status: 503 }
      );
    }

    // Try to initialize database (idempotent - safe to call multiple times)
    try {
      await initializeDatabase();
    } catch (initError) {
      console.error('[Health] Database initialization failed:', initError);
      return NextResponse.json(
        {
          status: 'error',
          message: 'Database initialization failed',
          error: initError instanceof Error ? initError.message : 'Unknown initialization error',
          hint: 'Check MongoDB connection string and network access',
        },
        { status: 503 }
      );
    }

    // Get connection info
    let connectionInfo;
    try {
      connectionInfo = await getConnectionInfo();
    } catch (connError) {
      console.error('[Health] Connection check failed:', connError);
      return NextResponse.json(
        {
          status: 'error',
          message: 'MongoDB connection check failed',
          error: connError instanceof Error ? connError.message : 'Unknown connection error',
          hint: 'Verify MONGODB_URI and MongoDB Atlas network access',
        },
        { status: 503 }
      );
    }

    if (!connectionInfo.connected) {
      console.error('[Health] MongoDB not connected:', connectionInfo.error);
      return NextResponse.json(
        {
          status: 'error',
          message: 'MongoDB connection failed',
          error: connectionInfo.error,
          hint: 'Check MongoDB Atlas cluster status and IP whitelist',
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
    console.error('[Health] Unexpected error:', error);

    // Return 503 (Service Unavailable) instead of 500 for health checks
    // This tells Railway the service isn't ready yet, not that it's broken
    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        hint: 'Check Railway logs for detailed error information',
      },
      { status: 503 }
    );
  }
}
