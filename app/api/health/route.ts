/**
 * Health Check Endpoint - Trivial version for Railway
 * 
 * Returns 200 OK immediately and unconditionally.
 * Railway only needs to verify the process is up and listening.
 * 
 * Database initialization and env validation happen lazily on first real API call.
 * For deep health checks, use a separate endpoint like /api/deep-health
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Trivial health check - always return 200 OK
  // No env checks, no DB calls, no external APIs
  // Railway just needs to know the process is listening
  return NextResponse.json({
    status: 'ok',
  }, { status: 200 });
}
