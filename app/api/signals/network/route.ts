/**
 * Network Signal Endpoint (Paywalled)
 *
 * What is a network signal?
 * - Shows who this user is connected to (shared IPs, devices, payment methods)
 * - Example: If your device ID shows up on 5 known fraudulent accounts, that's a red flag
 * - Fraudsters often work in rings - they share resources and coordinate
 *
 * Why this costs more ($0.25 vs $0.10 for velocity):
 * - Requires graph database queries across millions of connections
 * - More computationally expensive
 * - Provides deeper insights than simple counting
 *
 * The x402 Payment Flow (same as velocity):
 *
 * First Request (no payment):
 * GET /api/signals/network?userId=user_123&transactionId=TX-001
 * → 402 Payment Required: "This costs $0.25"
 *
 * After payment:
 * GET /api/signals/network?userId=user_123&transactionId=TX-001
 * Header: X-Payment-Proof: xyz789abc...
 * → 200 OK with network data
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  SIGNAL_PRICES,
  verifyPaymentProof,
  getExistingSignal,
  generateNetworkSignal,
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
    // If L2 bought it, Final Reviewer can read it for free (no double-charging)
    const existingSignal = await getExistingSignal(transactionId, 'network');

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
          amount: SIGNAL_PRICES.network,
          currency: 'USD',
          signalType: 'network',

          // Tell them where to pay
          paymentUrl: '/api/payments',
          paymentInstructions: {
            step1: 'POST to /api/payments with body: { amount: 0.25, signalType: "network", transactionId: "..." }',
            step2: 'Receive paymentProof in response',
            step3: 'Retry this request with header: X-Payment-Proof: <proof>',
          },

          // Why is this expensive?
          costReason: 'Network analysis requires graph queries across user connections, devices, and IPs',
        },
        {
          status: 402, // HTTP 402 = Payment Required
          headers: {
            'X-Payment-Required': `${SIGNAL_PRICES.network} USD`,
            'X-Payment-URL': '/api/payments',
            'X-Signal-Type': 'network',
          },
        }
      );
    }

    // THEY HAVE A PAYMENT PROOF = Verify it's legit
    const verification = await verifyPaymentProof(paymentProof, 'network');

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

    let actualCost: number = SIGNAL_PRICES.network;
    let negotiationOutcome: any = null;

    // Evaluate negotiation if pitch provided
    if (negotiationPitch && proposedPriceParam) {
      const proposedPrice = parseFloat(proposedPriceParam);

      negotiationOutcome = await evaluateNegotiation(
        'network',
        SIGNAL_PRICES.network,
        proposedPrice,
        negotiationPitch,
        transactionId
      );

      if (negotiationOutcome.accepted) {
        actualCost = proposedPrice;
        console.log(`[Network] Negotiation ACCEPTED: $${proposedPrice.toFixed(2)} (${((1 - proposedPrice / SIGNAL_PRICES.network) * 100).toFixed(0)}% discount)`);
      } else {
        actualCost = SIGNAL_PRICES.network;
        console.log(`[Network] Negotiation REJECTED: Charging full price $${SIGNAL_PRICES.network.toFixed(2)}`);
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
        console.error('[Network] Failed to log negotiation outcome:', error);
      }
    }

    // PAYMENT VERIFIED! Generate and return the signal data
    const signalData = generateNetworkSignal(userId, transactionId);

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
      console.warn('Network signal generated but failed to cache in MongoDB');
    }

    // Update payment record with retry request and success response (complete x402 audit trail)
    await updatePaymentWithRetry(
      paymentProof,
      'network',
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
    console.error('Network signal error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve network signal',
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
 *   "signalType": "network",
 *   "signalId": "sig_network_1704556900_xyz789",
 *   "transactionId": "TX-001",
 *   "userId": "user_123",
 *   "data": {
 *     "connectedUsers": 8,              ← Total users in network
 *     "sharedDevices": 2,               ← Devices shared with others
 *     "sharedIPs": 12,                  ← IP addresses used by multiple accounts
 *     "suspiciousConnections": 2,       ← Connected to known fraudsters
 *     "networkRiskScore": 0.85,         ← 0-1 risk score (0.85 = HIGH RISK!)
 *
 *     "flaggedConnections": [           ← Details about bad actors
 *       {
 *         "userId": "user_fraud_001",
 *         "relationship": "shared_device",  ← How they're connected
 *         "fraudHistory": true,
 *         "riskLevel": "HIGH",
 *         "lastSeenDate": "2025-01-02"
 *       },
 *       {
 *         "userId": "user_fraud_002",
 *         "relationship": "shared_ip",
 *         "fraudHistory": true,
 *         "riskLevel": "MEDIUM",
 *         "lastSeenDate": "2024-12-28"
 *       }
 *     ],
 *
 *     "graphMetrics": {
 *       "clusteringCoefficient": 0.35,  ← How tightly connected (0-1)
 *       "centralityScore": 0.12         ← How central in network (0-1)
 *     },
 *
 *     "interpretation": "🚨 HIGH RISK - Connected to 2 known fraudulent accounts",
 *     "flags": ["FRAUD_NETWORK", "MULTIPLE_BAD_ACTORS"]
 *   },
 *   "purchasedAt": "2025-01-05T10:35:00Z",
 *   "expiresAt": "2025-01-05T11:35:00Z",
 *   "cost": 0.25
 * }
 *
 * How an agent would use this:
 * - networkRiskScore > 0.7 → strong signal to DENY
 * - suspiciousConnections >= 2 → definitely escalate or deny
 * - FRAUD_NETWORK flag → this user is in a known fraud ring
 * - Low network risk + clean connections → probably legit
 *
 * Why this is powerful:
 * - Individual transaction might look normal
 * - But network analysis reveals they're connected to fraudsters
 * - Catches organized fraud rings, not just individual bad actors
 */
