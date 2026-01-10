/**
 * Velocity Signal Endpoint (Paywalled)
 *
 * What is a velocity signal?
 * - Shows how fast a user is transacting compared to their normal behavior
 * - Example: If you normally buy 3 things/day but suddenly buy 20, that's high velocity
 * - Fraudsters often "burst" - they steal a card and use it rapidly before it's blocked
 *
 * The x402 Payment Flow:
 *
 * First Request (no payment):
 * GET /api/signals/velocity?userId=user_123&transactionId=TX-001
 * → 402 Payment Required: "This costs $0.10"
 *
 * After payment:
 * GET /api/signals/velocity?userId=user_123&transactionId=TX-001
 * Header: X-Payment-Proof: abc123xyz...
 * → 200 OK with velocity data
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  SIGNAL_PRICES,
  verifyPaymentProof,
  getExistingSignal,
  generateVelocitySignal,
  saveSignal,
  updatePaymentWithRetry,
} from '@/lib/x402';
import { callLLM } from '@/lib/fireworks';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    // Get parameters from URL
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const transactionId = searchParams.get('transactionId');

    // Validate: Do we have required parameters?
    if (!userId || !transactionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: userId and transactionId',
        },
        { status: 400 }
      );
    }

    // Check if this signal was already purchased for this transaction
    // If L1 bought it, L2 can read it for free (no double-charging)
    const existingSignal = await getExistingSignal(transactionId, 'velocity');

    if (existingSignal) {
      // Already purchased - return it for free
      return NextResponse.json({
        success: true,
        message: 'Signal already purchased for this transaction',
        cached: true,
        ...existingSignal,
      });
    }

    // Check if they paid - look for the payment receipt in the header
    const paymentProof = request.headers.get('X-Payment-Proof');

    // NO PAYMENT PROOF = Return 402 "Payment Required"
    if (!paymentProof) {
      return NextResponse.json(
        {
          error: 'Payment Required',
          message: 'This signal requires payment. Pay first, then retry with proof.',
          amount: SIGNAL_PRICES.velocity,
          currency: 'USD',
          signalType: 'velocity',

          // Tell them where to pay
          paymentUrl: '/api/payments',
          paymentInstructions: {
            step1: 'POST to /api/payments with body: { amount: 0.10, signalType: "velocity", transactionId: "..." }',
            step2: 'Receive paymentProof in response',
            step3: 'Retry this request with header: X-Payment-Proof: <proof>',
          },
        },
        {
          status: 402, // This is the special "Payment Required" HTTP status code
          headers: {
            'X-Payment-Required': `${SIGNAL_PRICES.velocity} USD`,
            'X-Payment-URL': '/api/payments',
            'X-Signal-Type': 'velocity',
          },
        }
      );
    }

    // THEY HAVE A PAYMENT PROOF = Verify it's legit
    const verification = await verifyPaymentProof(paymentProof, 'velocity');

    if (!verification.valid) {
      // Invalid or expired proof - return 402 again
      return NextResponse.json(
        {
          error: 'Invalid Payment Proof',
          message: verification.error,
          hint: 'Payment proofs expire after 1 hour. You may need to pay again.',
        },
        { status: 402 }
      );
    }

    // Check for negotiation parameters
    const proposedPriceParam = searchParams.get('proposedPrice');
    const negotiationPitch = searchParams.get('negotiationPitch');

    let actualCost: number = SIGNAL_PRICES.velocity;
    let negotiationOutcome: any = null;

    // Evaluate negotiation if pitch provided
    if (negotiationPitch && proposedPriceParam) {
      const proposedPrice = parseFloat(proposedPriceParam);

      negotiationOutcome = await evaluateNegotiation(
        'velocity',
        SIGNAL_PRICES.velocity,
        proposedPrice,
        negotiationPitch,
        transactionId
      );

      if (negotiationOutcome.accepted) {
        actualCost = proposedPrice;
        console.log(`[Velocity] Negotiation ACCEPTED: $${proposedPrice.toFixed(2)} (${((1 - proposedPrice / SIGNAL_PRICES.velocity) * 100).toFixed(0)}% discount)`);
      } else {
        actualCost = SIGNAL_PRICES.velocity;
        console.log(`[Velocity] Negotiation REJECTED: Charging full price $${SIGNAL_PRICES.velocity.toFixed(2)}`);
      }

      // Log negotiation outcome to MongoDB payments collection
      try {
        const db = await getDatabase();
        await db.collection(COLLECTIONS.PAYMENTS).updateOne(
          { paymentProof: paymentProof },
          {
            $set: {
              negotiationOutcome: {
                ...negotiationOutcome,
                evaluatedAt: new Date(),
              },
              actualCost,
            },
          }
        );
      } catch (error) {
        console.error('[Velocity] Failed to log negotiation outcome:', error);
      }
    }

    // PAYMENT VERIFIED! Generate and return the signal data
    const signalData = generateVelocitySignal(userId, transactionId);

    // Add metadata about who bought it
    const enrichedSignal = {
      ...signalData,
      paymentId: verification.paymentId,
      purchasedBy: request.headers.get('X-Agent-Name') || 'Unknown',
      actualCost,
      negotiationOutcome,
    };

    // Save to MongoDB so other agents can read it later for free
    const saved = await saveSignal(enrichedSignal);

    if (!saved) {
      // Signal generation succeeded but save failed - return data with warning
      console.warn('Velocity signal generated but failed to cache in MongoDB');
    }

    // Update payment record with retry request and success response (complete x402 audit trail)
    await updatePaymentWithRetry(
      paymentProof,
      'velocity',
      request.url,
      Object.fromEntries(request.headers.entries())
    );

    // Return the data!
    return NextResponse.json({
      success: true,
      message: saved ? 'Signal purchased and delivered' : 'Signal delivered (cache failed)',
      cached: saved,
      ...enrichedSignal,
    });
  } catch (error) {
    console.error('Velocity signal error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve velocity signal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Evaluate a negotiation pitch using LLM
 */
async function evaluateNegotiation(
  signalType: string,
  fullPrice: number,
  proposedPrice: number,
  pitch: string,
  transactionId: string
): Promise<{
  accepted: boolean;
  reasoning: string;
  discount: number;
  discountPercentage: number;
}> {
  try {
    const discount = fullPrice - proposedPrice;
    const discountPercentage = (discount / fullPrice) * 100;

    // Check if price is within acceptable range (20-40% discount)
    const minAcceptablePrice = fullPrice * 0.60; // 40% discount max
    const maxAcceptablePrice = fullPrice * 0.80; // 20% discount min

    if (proposedPrice < minAcceptablePrice) {
      // Discount too steep - auto-reject
      return {
        accepted: false,
        reasoning: `Proposed price $${proposedPrice.toFixed(2)} is below minimum acceptable threshold ($${minAcceptablePrice.toFixed(2)}). Discount of ${discountPercentage.toFixed(0)}% exceeds maximum 40% allowed.`,
        discount,
        discountPercentage,
      };
    }

    if (proposedPrice > maxAcceptablePrice) {
      // Discount too small - auto-reject (not worth negotiating)
      return {
        accepted: false,
        reasoning: `Proposed price $${proposedPrice.toFixed(2)} is above threshold for negotiation ($${maxAcceptablePrice.toFixed(2)}). Please pay full price or negotiate a deeper discount (20-40% range).`,
        discount,
        discountPercentage,
      };
    }

    // Price is within range - use LLM to evaluate the pitch quality
    const systemPrompt = `You are an economic evaluator for a fraud detection signal marketplace. Your job is to evaluate negotiation pitches from AI agents requesting discounted pricing for signals.

You must determine if the agent's reasoning is logical, specific, and economically sound. Accept pitches that demonstrate clear economic constraints and quantitative reasoning. Reject vague, generic, or illogical pitches.`;

    const userPrompt = `Evaluate this negotiation pitch for purchasing a ${signalType} fraud detection signal.

PRICING DETAILS:
- Full Price: $${fullPrice.toFixed(2)}
- Proposed Price: $${proposedPrice.toFixed(2)}
- Discount: ${discountPercentage.toFixed(1)}% (within acceptable 20-40% range)

AGENT'S NEGOTIATION PITCH:
"${pitch}"

EVALUATION CRITERIA:
1. Is the pitch specific and quantitative (mentions actual dollar amounts, percentages, transaction size)?
2. Does the pitch demonstrate genuine economic constraints (low transaction value, margin pressure)?
3. Is the reasoning logical and well-structured?
4. Does the agent explain mutual benefit (signal still provides value at lower price)?

Return JSON in this format:
{
  "accepted": true/false,
  "reasoning": "Your 1-2 sentence explanation for accept/reject decision"
}

IMPORTANT: Be generous with well-reasoned pitches that show economic thinking. Be strict with generic or vague requests.`;

    const response = await callLLM<{
      accepted: boolean;
      reasoning: string;
    }>(systemPrompt, userPrompt, { type: 'json_object' });

    return {
      accepted: response.accepted,
      reasoning: response.reasoning,
      discount,
      discountPercentage,
    };
  } catch (error) {
    console.error('[Negotiation Evaluation] LLM failed:', error);
    // Fallback: reject on error
    return {
      accepted: false,
      reasoning: 'Negotiation evaluation failed due to system error. Please pay full price.',
      discount: fullPrice - proposedPrice,
      discountPercentage: ((fullPrice - proposedPrice) / fullPrice) * 100,
    };
  }
}

/**
 * Example Response (when payment verified):
 *
 * {
 *   "success": true,
 *   "signalType": "velocity",
 *   "signalId": "sig_velocity_1704556800_abc123",
 *   "transactionId": "TX-001",
 *   "userId": "user_123",
 *   "data": {
 *     "last24hTxCount": 18,           ← How many transactions in last 24h
 *     "last7dTxCount": 72,            ← Last week
 *     "avgDailyTxCount": 5,           ← Normal behavior
 *     "velocityScore": 0.72,          ← 0-1 risk score (0.72 = elevated!)
 *     "accountAgeHours": 2400,        ← Account is 100 days old
 *     "firstTxDate": "2024-10-01",
 *     "interpretation": "⚠️ ELEVATED - User is transacting 1.4x faster than normal",
 *     "flags": ["HIGH_VELOCITY"]      ← Automatic risk flags
 *   },
 *   "purchasedAt": "2025-01-05T10:30:00Z",
 *   "expiresAt": "2025-01-05T11:30:00Z",  ← Expires in 1 hour
 *   "cost": 0.10
 * }
 *
 * How an agent would use this:
 * - velocityScore > 0.7 → probably escalate to L2
 * - NEW_ACCOUNT flag + high velocity → definitely suspicious
 * - Low velocity + old account → probably legit
 */
