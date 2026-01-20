/**
 * FINAL REVIEWER - Ultimate Decision Maker
 *
 * ROLE: Makes the final APPROVE or DENY decision
 *
 * WHAT IT DOES:
 * 1. Reads ALL previous agent decisions (L1, L2 if escalated)
 * 2. Reads ALL purchased signals for free (velocity, network)
 * 3. Applies final review logic
 * 4. Makes ultimate decision: APPROVE or DENY
 * 5. Updates case status to COMPLETED
 * 6. Case is done!
 *
 * WHY FINAL REVIEWER EXISTS:
 * - Safety net: catches agent mistakes
 * - Consistency: ensures all decisions follow same final rules
 * - Confidence check: if L1/L2 aren't confident, Final Reviewer reconsiders
 * - Audit requirement: human-reviewable final step
 * - Can override L1/L2 if evidence is weak
 *
 * DECISION LOGIC:
 * The Final Reviewer uses a combination of:
 * - Agent consensus: do L1 and L2 agree?
 * - Confidence scores: are agents sure?
 * - Signal data: what do velocity/network signals show?
 * - Risk factors: how many red flags?
 *
 * EXAMPLES:
 * - L1: DENY (conf: 0.95) → Final: DENY (confident decision)
 * - L1: ESCALATE → L2: DENY (conf: 0.90) → Final: DENY (deep analysis confirmed)
 * - L1: APPROVE (conf: 0.60) → Final: Reconsider (low confidence)
 * - L1: ESCALATE → L2: APPROVE (conf: 0.85) → Final: APPROVE (deep dive cleared it)
 *
 * WHY NO LLM?
 * - Final Reviewer uses deterministic logic (consistent decisions)
 * - Faster (no API calls)
 * - Cheaper (no LLM costs)
 * - Transparent (rules are clear, not black box)
 * - For v2, could add LLM for edge cases
 */

import { getDatabase, COLLECTIONS } from '../mongodb';
import { triggerCustomerNotification } from './customer-notification-agent';
import { callLLM, formatTransactionForLLM, formatSignalForLLM } from '../fireworks';

/**
 * Run Final Reviewer on a case
 */
export async function runFinalReviewer(transactionId: string) {
  const db = await getDatabase();
  const startTime = Date.now();

  console.log(`\n⚖️ [Final Reviewer] Starting final review for ${transactionId}`);

  try {
    // Step 1: Read the transaction
    const transaction = await db.collection(COLLECTIONS.TRANSACTIONS).findOne({ transactionId });

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // Step 2: Read ALL agent decisions
    const decisions = await db
      .collection(COLLECTIONS.DECISIONS)
      .find({ transactionId })
      .sort({ timestamp: 1 }) // Chronological order
      .toArray();

    // Step 3: Read ALL signals (free - already purchased)
    const signals = await db
      .collection(COLLECTIONS.SIGNALS)
      .find({ transactionId })
      .toArray();

    const velocitySignal = signals.find((s) => s.signalType === 'velocity');
    const networkSignal = signals.find((s) => s.signalType === 'network');

    // Step 4: Update case status
    await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
      { transactionId },
      {
        $set: {
          currentAgent: 'Final Reviewer',
          updatedAt: new Date(),
        },
        $push: { agentHistory: 'Final Reviewer' } as any,
      }
    );

    // Step 5: Log start of review
    const stepNumber = await db
      .collection(COLLECTIONS.AGENT_STEPS)
      .countDocuments({ transactionId }) + 1;

    await db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
      transactionId,
      stepNumber,
      agentName: 'Final Reviewer',
      action: 'REVIEW_STARTED',
      timestamp: new Date(startTime),
      input: {
        l1Decision: decisions.find((d) => d.agentName === 'L1 Analyst'),
        l2Decision: decisions.find((d) => d.agentName === 'L2 Analyst'),
        signalsAvailable: signals.map((s) => s.signalType),
      },
      output: null,
      metadata: { status: 'reviewing' },
    });

    // Step 6: Call LLM for final decision
    // The Final Reviewer DOES use LLM - it synthesizes all evidence
    console.log(`🤖 [Final Reviewer] Calling LLM for final decision...`);

    const systemPrompt = `You are the Final Reviewer - the ultimate decision-making authority for fraud cases.

YOUR ROLE:
- You make the final APPROVE or DENY decision
- You review all previous agent analyses
- You have access to all purchased signals
- Your decision is FINAL and cannot be overridden

YOUR DECISION FRAMEWORK:
- APPROVE: Allow the transaction to proceed
- DENY: Block the transaction as fraudulent

DECISION CRITERIA:
1. Agent Consensus:
   - If all agents agree (high confidence) → usually follow their decision
   - If agents disagree → dig deeper, weigh evidence

2. Confidence Levels:
   - Agent confidence < 0.7 → be skeptical, verify evidence
   - Agent confidence > 0.9 → strong signal, usually agree

3. Signal Evidence:
   - Velocity score > 0.8 = major red flag
   - Network risk > 0.7 = fraud ring likely
   - Multiple risk factors together = strong fraud signal

4. Risk Tolerance:
   - When in doubt, DENY (protecting the platform is priority)
   - False positive (blocking legit user) < False negative (letting fraud through)

5. Override Authority:
   - You CAN override agents if their reasoning is weak
   - You CAN approve despite concerns if evidence is thin
   - Your judgment matters most

Return JSON with:
{
  "decision": "APPROVE" | "DENY",
  "confidence": 0.0-1.0,
  "reasoning": "Clear explanation of final decision",
  "agentSummary": "Brief summary of what agents found",
  "keyFactors": ["list", "of", "deciding", "factors"]
}`;

    const l1Decision = decisions.find((d) => d.agentName === 'L1 Analyst');
    const l2Decision = decisions.find((d) => d.agentName === 'L2 Analyst');

    const userPrompt = `Make the final decision on this case:

${formatTransactionForLLM(transaction)}

AGENT ANALYSES:

L1 Analyst:
- Decision: ${l1Decision?.decision || 'N/A'}
- Confidence: ${l1Decision?.confidence || 'N/A'}
- Reasoning: ${l1Decision?.reasoning || 'N/A'}
- Risk Factors: ${l1Decision?.riskFactors?.join(', ') || 'None'}

${l2Decision ? `L2 Analyst (Deep Dive):
- Decision: ${l2Decision.decision}
- Confidence: ${l2Decision.confidence}
- Reasoning: ${l2Decision.reasoning}
- Risk Factors: ${l2Decision.riskFactors.join(', ')}
` : 'L2 Analyst: NOT CONSULTED (L1 made clear decision)'}

SIGNAL DATA:

${velocitySignal ? formatSignalForLLM(velocitySignal) : 'No velocity signal purchased'}

${networkSignal ? formatSignalForLLM(networkSignal) : 'No network signal purchased'}

TOTAL INVESTIGATION COST: $${transaction.totalCost?.toFixed(2) || '0.00'}

Make your final decision. This is the ultimate call - APPROVE or DENY.`;

    const finalDecision = await callLLM<{
      decision: 'APPROVE' | 'DENY';
      confidence: number;
      reasoning: string;
      agentSummary: string;
      keyFactors: string[];
    }>(systemPrompt, userPrompt);

    console.log(
      `✅ [Final Reviewer] FINAL DECISION: ${finalDecision.decision} (confidence: ${finalDecision.confidence})`
    );

    // Step 7: Save final decision to decisions collection
    await db.collection(COLLECTIONS.DECISIONS).insertOne({
      transactionId,
      agentName: 'Final Reviewer',
      decision: finalDecision.decision,
      confidence: finalDecision.confidence,
      reasoning: finalDecision.reasoning,
      riskFactors: finalDecision.keyFactors,
      recommendation: 'FINAL DECISION',
      timestamp: new Date(),

      // Metadata
      signalsUsed: signals.map((s) => s.signalType),
      signalCost: 0, // Final Reviewer doesn't purchase signals
      model: 'llama-v3p1-70b-instruct',
      processingTime: Date.now() - startTime,
    });

    // Step 8: Log completion to timeline
    await db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
      transactionId,
      stepNumber: stepNumber + 1,
      agentName: 'Final Reviewer',
      action: 'REVIEW_COMPLETED',
      timestamp: new Date(),
      duration: Date.now() - startTime,
      input: {
        allDecisions: decisions,
        allSignals: signals,
      },
      output: {
        finalDecision: finalDecision.decision,
        confidence: finalDecision.confidence,
        reasoning: finalDecision.reasoning,
        agentSummary: finalDecision.agentSummary,
        keyFactors: finalDecision.keyFactors,
      },
      metadata: {
        caseComplete: true,
      },
    });

    // Step 9: Update transaction with final decision and mark COMPLETED
    await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
      { transactionId },
      {
        $set: {
          status: 'COMPLETED',
          finalDecision: finalDecision.decision,
          confidence: finalDecision.confidence,
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    // Step 10: If DENIED, trigger customer notification & verification
    if (finalDecision.decision === 'DENY') {
      await triggerCustomerNotification(transactionId);
    }

    console.log(`🎉 [Final Reviewer] Case ${transactionId} COMPLETED: ${finalDecision.decision}`);

    return {
      success: true,
      finalDecision: finalDecision.decision,
      confidence: finalDecision.confidence,
      reasoning: finalDecision.reasoning,
    };
  } catch (error) {
    console.error(`❌ [Final Reviewer] Review failed:`, error);

    // Log error to timeline
    const errorStepNumber = await db
      .collection(COLLECTIONS.AGENT_STEPS)
      .countDocuments({ transactionId }) + 1;

    await db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
      transactionId,
      stepNumber: errorStepNumber,
      agentName: 'Final Reviewer',
      action: 'ERROR',
      timestamp: new Date(),
      duration: Date.now() - startTime,
      input: {},
      output: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: { failed: true },
    });

    // Mark case as failed
    await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
      { transactionId },
      {
        $set: {
          status: 'FAILED',
          updatedAt: new Date(),
        },
      }
    );

    throw error;
  }
}

/**
 * DESIGN NOTES:
 *
 * 1. Why use LLM despite earlier saying "no LLM"?
 *    - REVISED DECISION: Final Reviewer needs to synthesize complex evidence
 *    - Better to have LLM weigh all factors than rigid rules
 *    - More flexible for edge cases
 *    - Still deterministic (low temperature)
 *
 * 2. Why read all signals for free?
 *    - Signals are already in MongoDB (purchased by L1/L2)
 *    - No x402 flow needed - just read from database
 *    - Complete picture for final decision
 *
 * 3. Why override authority?
 *    - L1 might deny at confidence 0.65 (uncertain)
 *    - Final Reviewer can look at full evidence and say "actually, approve"
 *    - Prevents overly-conservative agents from blocking good users
 *
 * 4. Why update status to COMPLETED?
 *    - Signals case is done
 *    - UI stops polling
 *    - User sees final decision
 *    - Ready for audit export
 *
 * 5. Why keyFactors instead of riskFactors?
 *    - Final Reviewer considers ALL factors (not just risks)
 *    - Might be: ["High transaction count", "But clean network", "Long account history"]
 *    - More balanced than just listing risks
 */
