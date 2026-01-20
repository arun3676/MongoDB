/**
 * POST /api/case/create
 *
 * Create a new fraud case and trigger agent analysis
 *
 * REQUEST BODY:
 * {
 *   "amount": 5000.00,
 *   "currency": "USD",
 *   "userId": "user_12345",
 *   "merchantId": "merchant_abc",
 *   "phone": "+15551234567",
 *   "email": "user@example.com",
 *   "metadata": {
 *     "deviceId": "...",
 *     "ipAddress": "...",
 *     "userAgent": "..."
 *   }
 * }
 *
 * RESPONSE:
 * {
 *   "success": true,
 *   "transactionId": "TX-1704556800-abc123",
 *   "status": "PROCESSING",
 *   "message": "Case created and analysis started"
 * }
 *
 * WHAT HAPPENS:
 * 1. Generate unique transaction ID
 * 2. Call Suspicion Agent to create case in MongoDB
 * 3. Suspicion Agent → Policy Agent → VOI/Budget Agent → Buyer/Decision Agent (async)
 * 4. Return immediately to user
 * 5. User polls GET /api/case/:transactionId to watch progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { runSuspicionAgent } from '@/lib/agents/suspicion-agent';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate required fields
    const { amount, currency = 'USD', userId, merchantId, metadata = {}, phone, email } = body;

    if (!amount || !userId || !merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: amount, userId, merchantId',
        },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid amount (must be positive number)',
        },
        { status: 400 }
      );
    }

    // Generate unique transaction ID
    // Format: TX-timestamp-random
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const transactionId = `TX-${timestamp}-${random}`;

    console.log(`\n📋 [API] Creating case ${transactionId} for $${amount} ${currency}`);

    // Create the case (triggers agent pipeline)
    const enrichedMetadata = { ...metadata };
    if (phone && !enrichedMetadata.phone) {
      enrichedMetadata.phone = phone;
    }
    if (email && !enrichedMetadata.email) {
      enrichedMetadata.email = email;
    }

    const result = await runSuspicionAgent({
      transactionId,
      amount,
      currency,
      userId,
      merchantId,
      metadata: enrichedMetadata,
    });

    console.log(`✅ [API] Case created: ${transactionId}`);

    // Return success
    return NextResponse.json({
      success: true,
      transactionId,
      status: 'PROCESSING',
      message: 'Case created and analysis started',
      pollUrl: `/api/case/${transactionId}`,
      pollInterval: 2000, // Frontend should poll every 2 seconds
    });
  } catch (error) {
    console.error('[API] Case creation failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create case',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * USAGE EXAMPLE:
 *
 * ```javascript
 * // Frontend submits transaction
 * const response = await fetch('/api/case/create', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     amount: 5000.00,
 *     userId: 'user_12345',
 *     merchantId: 'merchant_abc',
 *     metadata: {
 *       deviceId: 'device_xyz',
 *       ipAddress: '192.168.1.1',
 *     }
 *   })
 * });
 *
 * const { transactionId } = await response.json();
 * // → "TX-1704556800-abc123"
 *
 * // Frontend starts polling
 * setInterval(async () => {
 *   const status = await fetch(`/api/case/${transactionId}`);
 *   const data = await status.json();
 *
 *   if (data.status === 'COMPLETED') {
 *     console.log('Final decision:', data.finalDecision);
 *     // Stop polling
 *   }
 * }, 2000);
 * ```
 */
