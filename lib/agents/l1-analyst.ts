/**
 * L1 ANALYST - First Line of Defense
 *
 * ROLE: Fast initial screening of transactions
 *
 * WHAT IT DOES:
 * 1. Reads the transaction from MongoDB
 * 2. Does basic fraud checks (amount, patterns, metadata)
 * 3. MAY purchase velocity signal if suspicious ($0.10)
 * 4. Calls LLM to make a decision: APPROVE / DENY / ESCALATE
 * 5. Logs decision to MongoDB
 * 6. Triggers next agent (L2 or Final Reviewer)
 *
 * DECISION LOGIC:
 * - APPROVE: Clean transaction, low risk → send to Final Reviewer
 * - DENY: Obvious fraud (e.g., $50,000 from new account) → send to Final Reviewer
 * - ESCALATE: Uncertain, needs deep analysis → send to L2 Analyst
 *
 * WHY BUY VELOCITY SIGNAL?
 * - L1 can handle many cases without it (saves money)
 * - Only buys if transaction looks suspicious
 * - Example: $5,000 transaction → check if user normally does $50 transactions
 * - If velocityScore > 0.7 → probably escalate to L2
 *
 * AGENT PERSONALITY:
 * - Fast and cautious
 * - When in doubt, escalate (don't make final calls on edge cases)
 * - Optimizes for throughput (most cases should stop here)
 */

import { getDatabase, COLLECTIONS } from '../mongodb';
import { callLLM, formatTransactionForLLM, formatSignalForLLM } from '../fireworks';
import { runL2Analyst } from './l2-analyst';
import { runFinalReviewer } from './final-reviewer';

// Internal helper to purchase velocity signal via x402 flow
async function purchaseVelocitySignal(transactionId: string, userId: string) {
  try {
    // Step 1: Try to get signal without payment (will get 402)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3001';

    // Step 2: Make payment
    const paymentResponse = await fetch(`${baseUrl}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 0.10,
        signalType: 'velocity',
        transactionId,
        agentName: 'L1 Analyst',
      }),
    });

    if (!paymentResponse.ok) {
      throw new Error(`Payment failed: ${paymentResponse.statusText}`);
    }

    const { paymentProof } = await paymentResponse.json();

    // Step 3: Get signal with payment proof
    const signalResponse = await fetch(
      `${baseUrl}/api/signals/velocity?userId=${userId}&transactionId=${transactionId}`,
      {
        headers: {
          'X-Payment-Proof': paymentProof,
          'X-Agent-Name': 'L1 Analyst',
        },
      }
    );

    if (!signalResponse.ok) {
      throw new Error(`Signal fetch failed: ${signalResponse.statusText}`);
    }

    const signalData = await signalResponse.json();
    return signalData;
  } catch (error) {
    console.error('[L1] Failed to purchase velocity signal:', error);
    return null; // Continue without signal if purchase fails
  }
}

/**
 * Run L1 Analyst on a transaction
 */
export async function runL1Analyst(transactionId: string) {
  const db = await getDatabase();
  const startTime = Date.now();

  console.log(`\n🔍 [L1 Analyst] Starting analysis for ${transactionId}`);

  try {
    // Step 1: Read the transaction from MongoDB
    const transaction = await db.collection(COLLECTIONS.TRANSACTIONS).findOne({ transactionId });

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // Step 2: Update case status
    await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
      { transactionId },
      {
        $set: {
          currentAgent: 'L1 Analyst',
          updatedAt: new Date(),
        },
        $push: { agentHistory: 'L1 Analyst' } as any,
      }
    );

    // Step 3: Log start of analysis
    const stepNumber = await db
      .collection(COLLECTIONS.AGENT_STEPS)
      .countDocuments({ transactionId }) + 1;

    await db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
      transactionId,
      stepNumber,
      agentName: 'L1 Analyst',
      action: 'ANALYSIS_STARTED',
      timestamp: new Date(startTime),
      input: { transaction },
      output: null,
      metadata: { status: 'analyzing' },
    });

    // Step 4: Decide if we need to buy velocity signal
    // Simple heuristic: buy if amount > $1000 or metadata flags suspicious
    const shouldBuyVelocity =
      transaction.amount > 1000 ||
      transaction.metadata?.highRisk ||
      transaction.metadata?.newAccount;

    let velocitySignal = null;
    let signalCost = 0;

    if (shouldBuyVelocity) {
      console.log(`💳 [L1] Purchasing velocity signal for ${transactionId}...`);

      velocitySignal = await purchaseVelocitySignal(transactionId, transaction.userId);

      if (velocitySignal) {
        signalCost = 0.10;
        console.log(`✅ [L1] Velocity signal purchased (cost: $${signalCost})`);

        // Log signal purchase to timeline
        await db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
          transactionId,
          stepNumber: stepNumber + 1,
          agentName: 'L1 Analyst',
          action: 'SIGNAL_PURCHASED',
          timestamp: new Date(),
          input: { signalType: 'velocity', cost: signalCost },
          output: { signalData: velocitySignal.data },
          metadata: { paymentId: velocitySignal.paymentId },
        });
      }
    }

    // Step 5: Call LLM to analyze the transaction
    console.log(`🤖 [L1] Calling LLM for decision...`);

    const systemPrompt = `You are a Level 1 Fraud Analyst. Your job is to quickly screen transactions for obvious fraud patterns.

YOUR CAPABILITIES:
- You excel at spotting obvious red flags (huge amounts, suspicious patterns)
- You can access velocity signals to see transaction history
- You work FAST - you're the first line of defense

YOUR DECISION FRAMEWORK:
- APPROVE: Transaction looks clean and low-risk (confidence > 0.8)
- DENY: Obvious fraud, no doubt about it (confidence > 0.9)
- ESCALATE: You're uncertain, needs deeper analysis from L2 (confidence < 0.8)

IMPORTANT RULES:
1. When in doubt, ESCALATE (don't make risky final calls)
2. Only DENY if you're absolutely certain it's fraud
3. Only APPROVE if it's clearly legitimate
4. Be cautious with large amounts (>$5000)
5. New accounts + high amounts = usually ESCALATE

Return JSON with:
{
  "action": "APPROVE" | "DENY" | "ESCALATE",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of your decision",
  "riskFactors": ["list", "of", "concerns"],
  "recommendation": "What should happen next"
}`;

    const userPrompt = `Analyze this transaction:

${formatTransactionForLLM(transaction)}

${velocitySignal ? `\nVELOCITY DATA AVAILABLE:\n${formatSignalForLLM(velocitySignal)}` : '\nNo velocity signal purchased (transaction looks routine)'}

Make your decision.`;

    const decision = await callLLM<{
      action: 'APPROVE' | 'DENY' | 'ESCALATE';
      confidence: number;
      reasoning: string;
      riskFactors: string[];
      recommendation: string;
    }>(systemPrompt, userPrompt);

    console.log(`✅ [L1] Decision: ${decision.action} (confidence: ${decision.confidence})`);

    // Step 6: Save decision to decisions collection
    await db.collection(COLLECTIONS.DECISIONS).insertOne({
      transactionId,
      agentName: 'L1 Analyst',
      decision: decision.action,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      riskFactors: decision.riskFactors,
      recommendation: decision.recommendation,
      timestamp: new Date(),

      // What signals were used
      signalsUsed: velocitySignal ? ['velocity'] : [],
      signalCost,

      // LLM metadata
      model: 'llama-v3p1-70b-instruct',
      processingTime: Date.now() - startTime,
    });

    // Step 7: Log completion to timeline
    await db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
      transactionId,
      stepNumber: stepNumber + (velocitySignal ? 2 : 1),
      agentName: 'L1 Analyst',
      action: 'ANALYSIS_COMPLETED',
      timestamp: new Date(),
      duration: Date.now() - startTime,
      input: {
        transaction,
        velocitySignal: velocitySignal?.data || null,
      },
      output: {
        decision: decision.action,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        nextAgent: decision.action === 'ESCALATE' ? 'L2 Analyst' : 'Final Reviewer',
      },
      metadata: {
        signalCost,
        riskFactors: decision.riskFactors,
      },
    });

    // Step 8: Update total cost in transaction
    await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
      { transactionId },
      { $inc: { totalCost: signalCost } }
    );

    // Step 9: Trigger next agent
    if (decision.action === 'ESCALATE') {
      console.log(`⬆️ [L1] Escalating to L2 Analyst`);
      setImmediate(() => {
        runL2Analyst(transactionId).catch((error) => {
          console.error(`❌ [L1] L2 Analyst failed:`, error);
        });
      });
    } else {
      // APPROVE or DENY → go straight to Final Reviewer for confirmation
      console.log(`✅ [L1] Sending to Final Reviewer (decision: ${decision.action})`);
      setImmediate(() => {
        runFinalReviewer(transactionId).catch((error) => {
          console.error(`❌ [L1] Final Reviewer failed:`, error);
        });
      });
    }

    return {
      success: true,
      decision: decision.action,
      confidence: decision.confidence,
    };
  } catch (error) {
    console.error(`❌ [L1] Analysis failed:`, error);

    // Log error to timeline
    const errorStepNumber = await db
      .collection(COLLECTIONS.AGENT_STEPS)
      .countDocuments({ transactionId }) + 1;

    await db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
      transactionId,
      stepNumber: errorStepNumber,
      agentName: 'L1 Analyst',
      action: 'ERROR',
      timestamp: new Date(),
      duration: Date.now() - startTime,
      input: {},
      output: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: { failed: true },
    });

    throw error;
  }
}

/**
 * DESIGN NOTES:
 *
 * 1. Why conditional signal purchase?
 *    - Saves money! Most transactions don't need it
 *    - $10 transaction from old user = probably fine, skip signal
 *    - $5,000 from new account = definitely check velocity
 *
 * 2. Why log signal purchase as separate step?
 *    - Shows in timeline: "L1 bought velocity signal ($0.10)"
 *    - Complete audit trail of costs
 *    - User sees exactly what happened
 *
 * 3. Why three outcomes (APPROVE/DENY/ESCALATE)?
 *    - APPROVE: 70% of transactions (clean, low-risk)
 *    - ESCALATE: 25% (need L2's deeper analysis)
 *    - DENY: 5% (obvious fraud like $50k from brand new account)
 *    - L1 is conservative - when unsure, escalate
 *
 * 4. Why update totalCost incrementally?
 *    - Each agent adds to it: L1 +$0.10, L2 +$0.25 = $0.35 total
 *    - Frontend shows running total
 *    - Clear cost tracking
 */
