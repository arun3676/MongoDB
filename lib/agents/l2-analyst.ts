/**
 * L2 ANALYST - Deep Dive Specialist
 *
 * ROLE: Investigates complex cases that L1 couldn't decide
 *
 * WHAT IT DOES:
 * 1. Receives escalated cases from L1
 * 2. Reads L1's analysis and decision
 * 3. ALWAYS purchases network signal ($0.25) - needs graph data
 * 4. Reads velocity signal for free (L1 already bought it)
 * 5. Calls LLM for deep analysis
 * 6. Makes decision: APPROVE or DENY (no more escalation)
 * 7. Triggers Final Reviewer
 *
 * WHY L2 EXISTS:
 * - L1 filters 70% of cases (approve/deny obvious ones)
 * - 25% of cases are uncertain → need deeper analysis
 * - L2 has more expensive tools (network signal = $0.25)
 * - L2 takes more time (thorough investigation)
 *
 * THE NETWORK SIGNAL:
 * - Shows user's connections to other users
 * - Detects fraud rings (groups of fraudsters working together)
 * - Finds shared devices/IPs (account takeover patterns)
 * - Graph analysis: is this user central in a fraud network?
 *
 * DECISION LOGIC:
 * - APPROVE: After deep analysis, user looks legitimate
 *   Example: High velocity BUT connected to clean users = probably legit power user
 * - DENY: Connected to fraud network OR too many red flags
 *   Example: Shared device with 3 known fraudsters = definite fraud
 *
 * AGENT PERSONALITY:
 * - Thorough and methodical
 * - Uses ALL available data (velocity + network)
 * - Makes confident final recommendations
 * - No escalation path (must decide)
 */

import { getDatabase, COLLECTIONS } from '../mongodb';
import { callLLM, formatTransactionForLLM, formatSignalForLLM } from '../fireworks';
import { runFinalReviewer } from './final-reviewer';

// Internal helper to purchase network signal via x402 flow
async function purchaseNetworkSignal(transactionId: string, userId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3001';

    // Step 1: Make payment
    const paymentResponse = await fetch(`${baseUrl}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 0.25,
        signalType: 'network',
        transactionId,
        agentName: 'L2 Analyst',
      }),
    });

    if (!paymentResponse.ok) {
      throw new Error(`Payment failed: ${paymentResponse.statusText}`);
    }

    const { paymentProof } = await paymentResponse.json();

    // Step 2: Get signal with payment proof
    const signalResponse = await fetch(
      `${baseUrl}/api/signals/network?userId=${userId}&transactionId=${transactionId}`,
      {
        headers: {
          'X-Payment-Proof': paymentProof,
          'X-Agent-Name': 'L2 Analyst',
        },
      }
    );

    if (!signalResponse.ok) {
      throw new Error(`Signal fetch failed: ${signalResponse.statusText}`);
    }

    const signalData = await signalResponse.json();
    return signalData;
  } catch (error) {
    console.error('[L2] Failed to purchase network signal:', error);
    return null;
  }
}

/**
 * Run L2 Analyst on an escalated case
 */
export async function runL2Analyst(transactionId: string) {
  const db = await getDatabase();
  const startTime = Date.now();

  console.log(`\n🕵️ [L2 Analyst] Starting deep analysis for ${transactionId}`);

  try {
    // Step 1: Read the transaction
    const transaction = await db.collection(COLLECTIONS.TRANSACTIONS).findOne({ transactionId });

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // Step 2: Read L1's decision (to understand why we were escalated)
    const l1Decision = await db.collection(COLLECTIONS.DECISIONS).findOne({
      transactionId,
      agentName: 'L1 Analyst',
    });

    // Step 3: Read velocity signal (L1 may have purchased it)
    const velocitySignal = await db.collection(COLLECTIONS.SIGNALS).findOne({
      transactionId,
      signalType: 'velocity',
    });

    // Step 4: Update case status
    await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
      { transactionId },
      {
        $set: {
          currentAgent: 'L2 Analyst',
          updatedAt: new Date(),
        },
        $push: { agentHistory: 'L2 Analyst' } as any,
      }
    );

    // Step 5: Log start of analysis
    const stepNumber = await db
      .collection(COLLECTIONS.AGENT_STEPS)
      .countDocuments({ transactionId }) + 1;

    await db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
      transactionId,
      stepNumber,
      agentName: 'L2 Analyst',
      action: 'ANALYSIS_STARTED',
      timestamp: new Date(startTime),
      input: {
        transaction,
        l1Decision: l1Decision?.decision,
        l1Reasoning: l1Decision?.reasoning,
      },
      output: null,
      metadata: { status: 'deep_analysis' },
    });

    // Step 6: ALWAYS purchase network signal (this is L2's superpower)
    console.log(`🌐 [L2] Purchasing network signal for ${transactionId}...`);

    const networkSignal = await purchaseNetworkSignal(transactionId, transaction.userId);
    const signalCost = 0.25;

    if (!networkSignal) {
      throw new Error('Failed to purchase network signal - cannot proceed with L2 analysis');
    }

    console.log(`✅ [L2] Network signal purchased (cost: $${signalCost})`);

    // Log signal purchase to timeline
    await db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
      transactionId,
      stepNumber: stepNumber + 1,
      agentName: 'L2 Analyst',
      action: 'SIGNAL_PURCHASED',
      timestamp: new Date(),
      input: { signalType: 'network', cost: signalCost },
      output: { signalData: networkSignal.data },
      metadata: { paymentId: networkSignal.paymentId },
    });

    // Step 7: Call LLM for deep analysis
    console.log(`🤖 [L2] Calling LLM for deep analysis...`);

    const systemPrompt = `You are a Level 2 Fraud Analyst - a deep dive specialist. You handle complex cases that L1 couldn't decide.

YOUR CAPABILITIES:
- You have access to BOTH velocity and network signals
- You excel at detecting fraud rings and sophisticated patterns
- You analyze graph connections, shared devices, and behavioral patterns
- You take your time - accuracy matters more than speed

YOUR DECISION FRAMEWORK:
- APPROVE: After thorough analysis, user appears legitimate (confidence > 0.75)
- DENY: Evidence of fraud, especially network-based fraud (confidence > 0.75)

IMPORTANT RULES:
1. You MUST make a decision (no escalation option)
2. Consider L1's concerns but do your own analysis
3. Network signals are critical - fraud rings are a major red flag
4. Multiple risk factors together = likely fraud
5. One red flag in isolation might be explainable

FRAUD RING INDICATORS:
- Shared devices with known fraudsters
- Multiple flagged network connections
- High network risk score (>0.7)
- Account patterns matching fraud networks

LEGITIMATE PATTERNS:
- High velocity + clean network = power user
- Shared IP + low risk = family/office network
- New account + old network connections = device reuse

Return JSON with:
{
  "action": "APPROVE" | "DENY",
  "confidence": 0.0-1.0,
  "reasoning": "Detailed explanation of your decision",
  "riskFactors": ["list", "of", "concerns"],
  "recommendation": "What should happen next"
}`;

    const userPrompt = `Analyze this escalated case:

${formatTransactionForLLM(transaction)}

L1 ANALYST'S ASSESSMENT:
- Decision: ${l1Decision?.decision || 'ESCALATE'}
- Confidence: ${l1Decision?.confidence || 'N/A'}
- Reasoning: ${l1Decision?.reasoning || 'Escalated for deeper analysis'}
- Risk Factors: ${l1Decision?.riskFactors?.join(', ') || 'None specified'}

${velocitySignal ? `\nVELOCITY SIGNAL:\n${formatSignalForLLM(velocitySignal)}` : '\nNo velocity signal available'}

NETWORK SIGNAL (YOUR PRIMARY TOOL):
${formatSignalForLLM(networkSignal)}

Make your decision. This is a deep dive - use all available evidence.`;

    const decision = await callLLM<{
      action: 'APPROVE' | 'DENY';
      confidence: number;
      reasoning: string;
      riskFactors: string[];
      recommendation: string;
    }>(systemPrompt, userPrompt);

    console.log(`✅ [L2] Decision: ${decision.action} (confidence: ${decision.confidence})`);

    // Step 8: Save decision to decisions collection
    await db.collection(COLLECTIONS.DECISIONS).insertOne({
      transactionId,
      agentName: 'L2 Analyst',
      decision: decision.action,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      riskFactors: decision.riskFactors,
      recommendation: decision.recommendation,
      timestamp: new Date(),

      // What signals were used
      signalsUsed: ['network', ...(velocitySignal ? ['velocity'] : [])],
      signalCost,

      // LLM metadata
      model: 'llama-v3p1-70b-instruct',
      processingTime: Date.now() - startTime,
    });

    // Step 9: Log completion to timeline
    await db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
      transactionId,
      stepNumber: stepNumber + 2,
      agentName: 'L2 Analyst',
      action: 'ANALYSIS_COMPLETED',
      timestamp: new Date(),
      duration: Date.now() - startTime,
      input: {
        transaction,
        l1Decision,
        velocitySignal: velocitySignal?.data || null,
        networkSignal: networkSignal.data,
      },
      output: {
        decision: decision.action,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        nextAgent: 'Final Reviewer',
      },
      metadata: {
        signalCost,
        riskFactors: decision.riskFactors,
        totalSignalsUsed: velocitySignal ? 2 : 1,
      },
    });

    // Step 10: Update total cost in transaction
    await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
      { transactionId },
      { $inc: { totalCost: signalCost } }
    );

    // Step 11: Always trigger Final Reviewer
    console.log(`✅ [L2] Sending to Final Reviewer (decision: ${decision.action})`);
    setImmediate(() => {
      runFinalReviewer(transactionId).catch((error) => {
        console.error(`❌ [L2] Final Reviewer failed:`, error);
      });
    });

    return {
      success: true,
      decision: decision.action,
      confidence: decision.confidence,
    };
  } catch (error) {
    console.error(`❌ [L2] Analysis failed:`, error);

    // Log error to timeline
    const errorStepNumber = await db
      .collection(COLLECTIONS.AGENT_STEPS)
      .countDocuments({ transactionId }) + 1;

    await db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
      transactionId,
      stepNumber: errorStepNumber,
      agentName: 'L2 Analyst',
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
 * 1. Why always buy network signal?
 *    - L2 only runs on escalated cases (already suspicious)
 *    - Network analysis is L2's core competency
 *    - Worth the $0.25 cost to catch fraud rings
 *    - 25% of cases reach L2, so cost is controlled
 *
 * 2. Why read L1's decision?
 *    - Understand why case was escalated
 *    - L1 might have spotted something important
 *    - Build on L1's work (don't repeat basic checks)
 *    - Show continuity in audit trail
 *
 * 3. Why only APPROVE/DENY (no ESCALATE)?
 *    - L2 is the specialist - has most expensive tools
 *    - Nowhere to escalate to
 *    - Must make a decision (Final Reviewer will confirm)
 *    - Forces L2 to be decisive with all data
 *
 * 4. Why include L1's reasoning in LLM prompt?
 *    - Gives context: "L1 was worried about velocity"
 *    - Helps L2 focus investigation
 *    - Better decisions with more context
 *    - Continuity between agents
 */
