/**
 * Health Check Endpoint - Minimal version for Railway
 * 
 * Returns 200 OK immediately to pass healthcheck.
 * Database initialization happens lazily on first real API call.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Simple health check - just verify env vars are present
  // Don't import anything that could fail during module initialization
  const envStatus = {
    MONGODB_URI: !!process.env.MONGODB_URI,
    MONGODB_DB_NAME: !!process.env.MONGODB_DB_NAME,
    FIREWORKS_API_KEY: !!process.env.FIREWORKS_API_KEY,
  };

  const allEnvSet = Object.values(envStatus).every(Boolean);

  // Always return 200 for healthcheck
  // Even if some env vars are missing, let the app start
  // Errors will surface when APIs are actually called
  return NextResponse.json({
    status: 'ok',
    message: allEnvSet 
      ? 'Vigil fraud detection system is running'
      : 'Service running (some configuration pending)',
    environment: envStatus,
    timestamp: new Date().toISOString(),
  });
}
