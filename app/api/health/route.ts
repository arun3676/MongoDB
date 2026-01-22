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
    // Check for required environment variables first (fast check)
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

    // Quick MongoDB connection check (with timeout to avoid hanging)
    // Don't initialize database here - that happens lazily on first API call
    let connectionInfo;
    try {
      // Use Promise.race to timeout after 5 seconds
      const connectionPromise = getConnectionInfo();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection check timeout')), 5000)
      );
      
      connectionInfo = await Promise.race([connectionPromise, timeoutPromise]) as any;
    } catch (connError) {
      console.error('[Health] Connection check failed:', connError);
      // Return 200 OK even if DB isn't connected yet - app is still running
      // Database initialization happens lazily on first API call
      return NextResponse.json({
        status: 'ok',
        message: 'Service is running (database connection pending)',
        database: {
          connected: false,
          error: connError instanceof Error ? connError.message : 'Unknown error',
          hint: 'Database will initialize on first API call',
        },
        initialized: isDatabaseInitialized(),
        timestamp: new Date().toISOString(),
      });
    }

    if (!connectionInfo.connected) {
      // Still return 200 - app is running, DB just needs initialization
      return NextResponse.json({
        status: 'ok',
        message: 'Service is running (database initialization pending)',
        database: {
          connected: false,
          error: connectionInfo.error,
          hint: 'Database will initialize on first API call',
        },
        initialized: isDatabaseInitialized(),
        timestamp: new Date().toISOString(),
      });
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

    // Return 503 only for unexpected errors
    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check Railway logs for detailed error information',
      },
      { status: 503 }
    );
  }
}
