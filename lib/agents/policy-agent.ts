/**
 * POLICY AGENT - Rule Enforcement
 *
 * ROLE: Enforces fraud detection policies based on suspicion score
 *
 * WHAT IT DOES:
 * 1. Reads transaction and suspicion score from MongoDB
 * 2. Scans recent transactions for repeated IP/amount patterns
 * 3. Queries policies collection for active rules
 * 4. Applies policy thresholds (NO LLM - pure rules)
 * 5. Decides: APPROVE (low risk) or ESCALATE (needs analysis)
 * 6. Logs decision to timeline and decisions collection
 * 7. Triggers next agent (VOI Agent or Buyer Agent)
 *
 * POLICY THRESHOLDS:
 * - Suspicion < 0.3: APPROVE (unless recent pattern clustering is detected)
 * - Suspicion >= 0.3: ESCALATE (needs VOI analysis)
 * - Pattern clusters: elevate VOI priority for signals
 *
 * WHY THIS DESIGN?
 * - Deterministic rule enforcement (no randomness)
 * - Fast execution (no LLM calls)
 * - Clear audit trail of policy decisions
 * - Separates rules from reasoning (policy vs analysis)
 */

import type { Db } from 'mongodb';
import { getDatabase, COLLECTIONS } from '../mongodb';
import { runVOIAgent } from './voi-budget-agent';
import { runBuyerDecisionAgent } from './buyer-decision-agent';

const PATTERN_WINDOW_MS = 60 * 60 * 1000;
const AMOUNT_SIMILARITY_RATIO = 0.1;
const PATTERN_THRESHOLDS = {
  sameIp: 3,
  similarAmount: 5,
};

/**
 * Run Policy Agent on a transaction
 */
export async function runPolicyAgent(transactionId: string) {
  const db = await getDatabase();
  const startTime = Date.now();

  console.log(`\n📋 [Policy Agent] Enforcing policies for ${transactionId}`);

  try {
    // Step 1: Read transaction from MongoDB
    const transaction = await db.collection(COLLECTIONS.TRANSACTIONS).findOne({ transactionId });

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // Step 2: Get suspicion score from Suspicion Agent's timeline entry
    const suspicionStep = await db.collection(COLLECTIONS.AGENT_STEPS).findOne({
      transactionId,
      agentName: 'Suspicion Agent',
    });

    const suspicionScore = suspicionStep?.output?.suspicionScore || 0;
    const riskLevel = suspicionStep?.output?.riskLevel || 'UNKNOWN';

    console.log(`   Suspicion Score: ${suspicionScore.toFixed(2)} (${riskLevel})`);

    // Step 3: Scan recent transaction patterns (last hour)
    const ipAddress =
      typeof transaction.metadata?.ipAddress === 'string' &&
      transaction.metadata.ipAddress.trim().length > 0
        ? transaction.metadata.ipAddress.trim()
        : null;

    const patternScan = await scanRecentPatterns(
      db,
      transactionId,
      transaction.amount,
      ipAddress
    );

    console.log(
      `   Pattern scan (last ${patternScan.windowMinutes}m): same IP=${patternScan.sameIpCount}, similar amount=${patternScan.similarAmountCount}`
    );

    const patternFlags: string[] = [];
    if (ipAddress && patternScan.sameIpCount >= PATTERN_THRESHOLDS.sameIp) {
      patternFlags.push('RECENT_IP_CLUSTER');
    }
    if (patternScan.similarAmountCount >= PATTERN_THRESHOLDS.similarAmount) {
      patternFlags.push('RECENT_AMOUNT_CLUSTER');
    }

    const patternsDetected = patternFlags.length > 0;
    const voiPriority = patternsDetected ? 'HIGH' : 'NORMAL';

    // Step 4: Read policies from MongoDB
    const policies = await db
      .collection(COLLECTIONS.POLICIES)
      .find({ enabled: true })
      .toArray();

    console.log(`   Loaded ${policies.length} active policies`);

    // Step 5: Apply policy thresholds (deterministic - no LLM)
    let decision: 'APPROVE' | 'ESCALATE';
    let reasoning: string;
    let nextAgent: string;
    let riskFactors: string[] = [];
    const shouldEscalate = suspicionScore >= 0.3 || patternsDetected;
    const patternSummary = patternsDetected
      ? `Recent pattern scan (last ${patternScan.windowMinutes}m) found ${patternScan.sameIpCount} other tx with same IP and ${patternScan.similarAmountCount} similar-amount transactions`
      : '';

    if (!shouldEscalate) {
      // Low suspicion - approve without deep analysis
      decision = 'APPROVE';
      reasoning = `Suspicion score ${suspicionScore.toFixed(2)} is below policy threshold 0.3. Low risk transaction approved for fast processing.`;
      nextAgent = 'Buyer/Decision Agent'; // Skip VOI, go straight to final decision
      riskFactors = [];
    } else {
      // Medium/High suspicion - escalate for analysis
      decision = 'ESCALATE';
      if (suspicionScore < 0.3 && patternsDetected) {
        reasoning = `Suspicion score ${suspicionScore.toFixed(2)} is below policy threshold 0.3, but ${patternSummary}. Escalating to VOI to prioritize signal purchases.`;
      } else {
        reasoning = `Suspicion score ${suspicionScore.toFixed(2)} exceeds policy threshold 0.3. Requires Value-of-Information analysis to determine if purchasing signals is justified.${patternsDetected ? ` ${patternSummary}. VOI priority elevated.` : ''}`;
      }
      nextAgent = 'VOI/Budget Agent';

      // Add risk factors based on suspicion level
      if (patternsDetected) {
        riskFactors.push(...patternFlags);
      }
      if (suspicionScore >= 0.7) {
        riskFactors.push('HIGH_SUSPICION');
      } else if (suspicionScore >= 0.5) {
        riskFactors.push('MEDIUM_SUSPICION');
      } else {
        riskFactors.push('ELEVATED_SUSPICION');
      }

      if (transaction.amount > 5000) {
        riskFactors.push('HIGH_AMOUNT');
      }
    }

    console.log(`   Decision: ${decision} → ${nextAgent}`);

    // Step 6: Update transaction status
    await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
      { transactionId },
      {
        $set: {
          currentAgent: 'Policy Agent',
          updatedAt: new Date(),
        },
        $push: {
          agentHistory: 'Policy Agent' as any,
        },
      }
    );

    // Step 7: Log to timeline
    const currentStepNumber = 2; // Policy Agent is always step 2

    await db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
      transactionId,
      stepNumber: currentStepNumber,
      agentName: 'Policy Agent',
      action: 'POLICY_ENFORCEMENT',
      timestamp: new Date(),
      duration: Date.now() - startTime,

      input: {
        suspicionScore,
        riskLevel,
        policiesEvaluated: policies.length,
      },
      output: {
        decision,
        reasoning,
        nextAgent,
        riskFactors,
        voiPriority,
        patternScan: {
          windowMinutes: patternScan.windowMinutes,
          sameIpCount: patternScan.sameIpCount,
          similarAmountCount: patternScan.similarAmountCount,
          amountRange: patternScan.amountRange,
        },
        patternFlags,
      },

      metadata: {
        policyThreshold: 0.3,
        policiesApplied: policies.map((p) => p.policyId),
        patternThresholds: PATTERN_THRESHOLDS,
        amountSimilarityRatio: AMOUNT_SIMILARITY_RATIO,
      },
    });

    // Step 8: Log decision to decisions collection
    await db.collection(COLLECTIONS.DECISIONS).insertOne({
      decisionId: `dec_policy_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      transactionId,
      agentName: 'Policy Agent',
      decision,
      confidence: 1.0, // Policy enforcement is deterministic (100% confident)
      reasoning,
      riskFactors,
      voiPriority,
      patternScan: {
        windowMinutes: patternScan.windowMinutes,
        sameIpCount: patternScan.sameIpCount,
        similarAmountCount: patternScan.similarAmountCount,
        amountRange: patternScan.amountRange,
      },
      signalsUsed: [], // No signals used at this stage
      timestamp: new Date(),
      isFinal: false,
    });

    console.log(`✅ [Policy Agent] Decision logged`);

    // Step 9: Trigger next agent based on decision
    setImmediate(() => {
      if (decision === 'ESCALATE') {
        // High suspicion - send to VOI Agent for analysis
        runVOIAgent(transactionId).catch((error) => {
          console.error(`❌ [Policy Agent] VOI Agent failed:`, error);
        });
      } else {
        // Low suspicion - skip to final decision (no signal purchases needed)
        runBuyerDecisionAgent(transactionId, []).catch((error) => {
          console.error(`❌ [Policy Agent] Buyer Agent failed:`, error);
        });
      }
    });

    console.log(`🚀 [Policy Agent] Triggered ${nextAgent}`);

    return {
      success: true,
      decision,
      nextAgent,
    };
  } catch (error) {
    console.error(`❌ [Policy Agent] Failed:`, error);

    throw new Error(
      `Policy Agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function scanRecentPatterns(
  db: Db,
  transactionId: string,
  amount: number,
  ipAddress: string | null
): Promise<{
  sameIpCount: number;
  similarAmountCount: number;
  amountRange: { min: number; max: number };
  windowMinutes: number;
}> {
  const windowStart = new Date(Date.now() - PATTERN_WINDOW_MS);
  const amountDelta = Math.max(amount * AMOUNT_SIMILARITY_RATIO, 1);
  const amountRange = {
    min: Math.max(0, amount - amountDelta),
    max: amount + amountDelta,
  };

  const [counts] = await db
    .collection(COLLECTIONS.TRANSACTIONS)
    .aggregate([
      {
        $match: {
          transactionId: { $ne: transactionId },
          createdAt: { $gte: windowStart },
        },
      },
      {
        $facet: {
          sameIp: ipAddress
            ? [
                { $match: { 'metadata.ipAddress': ipAddress } },
                { $count: 'count' },
              ]
            : [
                { $match: { _id: null } },
                { $count: 'count' },
              ],
          similarAmount: [
            { $match: { amount: { $gte: amountRange.min, $lte: amountRange.max } } },
            { $count: 'count' },
          ],
        },
      },
      {
        $project: {
          sameIpCount: { $ifNull: [{ $arrayElemAt: ['$sameIp.count', 0] }, 0] },
          similarAmountCount: {
            $ifNull: [{ $arrayElemAt: ['$similarAmount.count', 0] }, 0],
          },
        },
      },
    ])
    .toArray();

  return {
    sameIpCount: counts?.sameIpCount ?? 0,
    similarAmountCount: counts?.similarAmountCount ?? 0,
    amountRange,
    windowMinutes: Math.round(PATTERN_WINDOW_MS / 60000),
  };
}

/**
 * DESIGN NOTES:
 *
 * 1. Why no LLM?
 *    - Policy enforcement should be deterministic
 *    - Rules are clear and don't need interpretation
 *    - Fast execution (no API calls)
 *    - Explainable (no black box)
 *
 * 2. Why threshold of 0.3?
 *    - Balances false positives vs false negatives
 *    - 30% suspicion = worth investigating
 *    - <30% = not worth signal purchase costs
 *    - Can be tuned based on business requirements
 *
 * 3. Why skip to Buyer Agent for low-risk cases?
 *    - Saves money (no signal purchases)
 *    - Fast approval path for clean transactions
 *    - VOI Agent would likely decide to skip signals anyway
 *    - Buyer Agent can still make final APPROVE decision with LLM
 *
 * 4. Why separate policy enforcement from analysis?
 *    - Single Responsibility Principle
 *    - Policy changes don't affect analysis logic
 *    - Clear audit trail: "Which policy triggered escalation?"
 *    - Different stakeholders (compliance vs engineering)
 */
