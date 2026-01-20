/**
 * SUSPICION AGENT - Initial Risk Assessment
 *
 * ROLE: Entry point for all fraud cases - calculates initial suspicion score
 *
 * WHAT IT DOES:
 * 1. Receives a new transaction
 * 2. Creates a case in MongoDB (transactions collection)
 * 3. Calculates suspicion score (0-1) using heuristics
 * 4. Creates budget document ($1.00 starting budget)
 * 5. Logs "Suspicion Analysis" to timeline (agent_steps collection)
 * 6. Triggers the Policy Agent to enforce rules
 *
 * SUSPICION HEURISTICS:
 * - Amount vs thresholds (>$5000 = suspicious)
 * - New account flag (+0.3)
 * - High risk flag (+0.4)
 * - International transfer flag (+0.2)
 * - Score capped at 1.0
 *
 * WHY THIS DESIGN?
 * - Fast initial screening (no LLM calls)
 * - Deterministic risk scoring
 * - Sets budget for downstream agents
 * - Clear audit trail of initial assessment
 */

import { getDatabase, COLLECTIONS } from '../mongodb';
import { initializeDatabase } from '../initDb';
import { runPolicyAgent } from './policy-agent';
import { getAnomalyScore } from '../ml/isolation-forest-client';

/**
 * Create a new fraud case and perform suspicion analysis
 */
export async function runSuspicionAgent(transactionData: {
  transactionId: string;
  amount: number;
  currency: string;
  userId: string;
  merchantId: string;
  metadata?: Record<string, any>;
}) {
  // Ensure database is initialized (idempotent - safe to call multiple times)
  await initializeDatabase();

  const db = await getDatabase();
  const timestamp = new Date();
  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  try {
    console.log(`\n🔍 [Suspicion Agent] Analyzing ${transactionData.transactionId}`);

    // Step 1: Get anomaly score from Isolation Forest ML service
    const mlResult = await getAnomalyScore({
      amount: transactionData.amount,
      accountAgeDays: transactionData.metadata?.accountAgeDays,
      confidence: 0.0, // Not available yet at this stage
      totalCost: 0.0, // Not available yet at this stage
      newAccount: transactionData.metadata?.newAccount || false,
      internationalTransfer: transactionData.metadata?.internationalTransfer || false,
      unusualHour: transactionData.metadata?.unusualHour || false,
      riskFlagCount: Array.isArray(transactionData.metadata?.riskFlags)
        ? transactionData.metadata.riskFlags.length
        : 0,
    });

    // Step 2: Calculate suspicion score using heuristics
    const heuristicScore = calculateSuspicionScore(transactionData);

    // Step 3: Combine ML anomaly score with heuristics
    // Weight: 60% ML score, 40% heuristics (ML is more sophisticated)
    let suspicionScore: number;
    let mlAnomalyScore: number | null = null;
    let mlExplanation: string | null = null;

    if (mlResult) {
      mlAnomalyScore = mlResult.anomalyScore;
      mlExplanation = mlResult.explanation;
      // Combine: weighted average of ML score and heuristics
      suspicionScore = mlResult.anomalyScore * 0.6 + heuristicScore * 0.4;
      console.log(`   🤖 ML Anomaly Score: ${mlResult.anomalyScore.toFixed(2)}`);
      console.log(`   📊 Heuristic Score: ${heuristicScore.toFixed(2)}`);
      console.log(`   🎯 Combined Score: ${suspicionScore.toFixed(2)}`);
    } else {
      // Fallback: use heuristics only if ML service unavailable
      suspicionScore = heuristicScore;
      console.log(`   ⚠️  ML service unavailable, using heuristics only`);
      console.log(`   📊 Heuristic Score: ${heuristicScore.toFixed(2)}`);
    }

    const riskLevel = suspicionScore < 0.3 ? 'LOW' : suspicionScore < 0.7 ? 'MEDIUM' : 'HIGH';
    console.log(`   ✅ Final Suspicion Score: ${suspicionScore.toFixed(2)} (${riskLevel})`);

    // Step 2: Create the case in MongoDB
    const caseDocument = {
      transactionId: transactionData.transactionId,
      amount: transactionData.amount,
      currency: transactionData.currency,
      userId: transactionData.userId,
      merchantId: transactionData.merchantId,
      metadata: transactionData.metadata || {},
      runId,

      // Case lifecycle tracking
      status: 'PROCESSING', // Will become 'COMPLETED' when Buyer Agent is done
      createdAt: timestamp,
      updatedAt: timestamp,

      // Final decision (filled in by Buyer Agent)
      finalDecision: null, // Will be 'APPROVE' or 'DENY'
      confidence: null, // 0-1 confidence score
      totalCost: 0, // Total spent on signals

      // Agent tracking
      currentAgent: 'Suspicion Agent',
      agentHistory: ['Suspicion Agent'],
    };

    await db.collection(COLLECTIONS.TRANSACTIONS).insertOne(caseDocument);
    console.log(`✅ [Suspicion Agent] Created case`);

    // Step 3: Create budget document ($1.00 per case)
    const budgetId = `budget_${transactionData.transactionId}_${Date.now()}`;
    const budgetDocument = {
      budgetId,
      transactionId: transactionData.transactionId,
      runId,

      startingBudget: 1.0, // $1.00 max per fraud case
      spentSoFar: 0,
      remainingBudget: 1.0,

      spendByTool: {},
      voiDecisions: [],

      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.collection(COLLECTIONS.BUDGET).insertOne(budgetDocument);
    console.log(`💰 [Suspicion Agent] Allocated $1.00 budget`);

    // Step 4: Log suspicion analysis to timeline
    const riskHeuristics = [];
    if (transactionData.amount > 5000) riskHeuristics.push(`High amount: $${transactionData.amount}`);
    if (transactionData.metadata?.newAccount) riskHeuristics.push('New account');
    if (transactionData.metadata?.highRisk) riskHeuristics.push('High risk user');
    if (transactionData.metadata?.internationalTransfer) riskHeuristics.push('International transfer');

    const timelineStep = {
      transactionId: transactionData.transactionId,
      stepNumber: 1,
      agentName: 'Suspicion Agent',
      action: 'SUSPICION_ANALYSIS',
      timestamp,
      duration: Date.now() - timestamp.getTime(),

      input: {
        transaction: {
          transactionId: transactionData.transactionId,
          amount: transactionData.amount,
          currency: transactionData.currency,
          userId: transactionData.userId,
          merchantId: transactionData.merchantId,
        },
      },
      output: {
        suspicionScore,
        riskLevel,
        riskHeuristics,
        budgetAllocated: 1.0,
        nextAgent: 'Policy Agent',
        mlAnomalyScore: mlAnomalyScore || undefined,
        mlExplanation: mlExplanation || undefined,
        mlServiceUsed: mlResult !== null,
      },

      metadata: {
        runId,
        budgetId,
      },
    };

    await db.collection(COLLECTIONS.AGENT_STEPS).insertOne(timelineStep);
    console.log(`📝 [Suspicion Agent] Logged timeline step 1`);

    // Step 5: Trigger Policy Agent (runs asynchronously)
    setImmediate(() => {
      runPolicyAgent(transactionData.transactionId).catch((error) => {
        console.error(`❌ [Suspicion Agent] Policy Agent failed:`, error);
      });
    });

    console.log(`🚀 [Suspicion Agent] Triggered Policy Agent`);

    // Return the case
    return {
      success: true,
      transactionId: transactionData.transactionId,
      runId,
      status: 'PROCESSING',
      suspicionScore,
      riskLevel,
      message: 'Case created and Policy Agent triggered',
    };
  } catch (error) {
    console.error(`❌ [Suspicion Agent] Failed:`, error);

    throw new Error(
      `Suspicion Agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Calculate suspicion score using business heuristics
 * Returns a score from 0 (no suspicion) to 1 (very suspicious)
 */
function calculateSuspicionScore(txData: {
  amount: number;
  metadata?: Record<string, any>;
}): number {
  let score = 0;

  // Amount-based heuristics
  if (txData.amount > 10000) {
    score += 0.5; // Very high amount
  } else if (txData.amount > 5000) {
    score += 0.3; // High amount
  } else if (txData.amount > 1000) {
    score += 0.1; // Moderate amount
  }

  // Metadata flags (these would come from merchant/user systems)
  if (txData.metadata?.newAccount) {
    score += 0.3; // New accounts are riskier
  }

  if (txData.metadata?.highRisk) {
    score += 0.4; // User flagged as high risk
  }

  if (txData.metadata?.internationalTransfer) {
    score += 0.2; // International adds risk
  }

  if (txData.metadata?.unusualHour) {
    score += 0.1; // 2 AM transactions are suspicious
  }

  // Cap at 1.0
  return Math.min(score, 1.0);
}

/**
 * DESIGN NOTES:
 *
 * 1. Why no LLM here?
 *    - Suspicion scoring should be fast and deterministic
 *    - Heuristics are clear and explainable
 *    - LLMs add latency for simple math
 *    - Save LLM calls for complex decisions later
 *
 * 2. Why create budget here?
 *    - Budget is allocated per-case
 *    - VOI Agent needs it to exist before analyzing
 *    - Centralizes budget initialization
 *
 * 3. Why $1.00 budget?
 *    - Prevents runaway costs
 *    - Forces agents to be selective
 *    - Realistic constraint for production systems
 *
 * 4. Why separate suspicionScore from LLM decisions?
 *    - Different sources of signal
 *    - Suspicion = heuristics (fast, cheap)
 *    - LLM = reasoning (slow, expensive, accurate)
 *    - Both are valuable in different stages
 */
