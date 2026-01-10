/**
 * ORCHESTRATOR AGENT - The Traffic Controller
 *
 * ROLE: Entry point for all fraud cases
 *
 * WHAT IT DOES:
 * 1. Receives a new transaction
 * 2. Creates a case in MongoDB (transactions collection)
 * 3. Logs "Case created" to timeline (agent_steps collection)
 * 4. Triggers the L1 Analyst to start analysis
 * 5. Returns the case ID
 *
 * WHAT IT DOESN'T DO:
 * - Doesn't analyze the transaction (that's L1's job)
 * - Doesn't call the LLM (pure coordination)
 * - Doesn't make fraud decisions
 *
 * WHY THIS DESIGN?
 * - Single Responsibility Principle: one agent = one job
 * - Clear separation: orchestration vs analysis
 * - Easy to modify the workflow without touching analysis logic
 * - Audit trail shows exactly when case was created
 *
 * EXAMPLE FLOW:
 * 1. User submits transaction via UI
 * 2. POST /api/case/create calls orchestrator.createCase()
 * 3. Orchestrator creates case → triggers L1
 * 4. L1 starts analyzing → may trigger L2
 * 5. L2 finishes → triggers Final Reviewer
 * 6. Final Reviewer makes decision → case complete
 */

import { getDatabase, COLLECTIONS } from '../mongodb';
import { runL1Analyst } from './l1-analyst';
import { runL2Analyst } from './l2-analyst';
import { runFinalReviewer } from './final-reviewer';
import { runSuspicionAgent } from './suspicion-agent';
import { runPolicyAgent } from './policy-agent';
import { runVOIAgent } from './voi-budget-agent';
import { runBuyerDecisionAgent } from './buyer-decision-agent';

/**
 * Create a new fraud case and start the analysis pipeline
 */
export async function createCase(transactionData: {
  transactionId: string;
  amount: number;
  currency: string;
  userId: string;
  merchantId: string;
  metadata?: Record<string, any>;
}) {
  const db = await getDatabase();
  const timestamp = new Date();

  try {
    // Step 0: Check if case already exists (RECOVERY LOGIC)
    const existingCase = await db.collection(COLLECTIONS.TRANSACTIONS).findOne({
      transactionId: transactionData.transactionId,
    });

    if (existingCase) {
      console.log(`🔄 [Orchestrator] Found existing case ${transactionData.transactionId}`);

      // If case is already COMPLETED, return it as-is
      if (existingCase.status === 'COMPLETED') {
        console.log(`✅ [Orchestrator] Case already completed with decision: ${existingCase.finalDecision}`);
        return {
          success: true,
          transactionId: transactionData.transactionId,
          status: 'COMPLETED',
          message: 'Case already completed',
          recovered: false,
        };
      }

      // If case is PROCESSING, attempt recovery
      if (existingCase.status === 'PROCESSING') {
        console.log(`🔄 [Orchestrator] Case is stuck in PROCESSING state - attempting recovery...`);

        const recoveryResult = await recoverCase(transactionData.transactionId);

        if (recoveryResult.recovered) {
          return {
            success: true,
            transactionId: transactionData.transactionId,
            status: 'PROCESSING',
            message: `Case recovered and resumed from ${recoveryResult.resumedFrom}`,
            recovered: true,
            resumedFrom: recoveryResult.resumedFrom,
          };
        }
      }

      // If we get here, case exists but in unknown state - return error
      return {
        success: false,
        transactionId: transactionData.transactionId,
        status: existingCase.status,
        message: `Case already exists with status: ${existingCase.status}`,
        recovered: false,
      };
    }

    // Step 1: Create NEW case in MongoDB
    const caseDocument = {
      transactionId: transactionData.transactionId,
      amount: transactionData.amount,
      currency: transactionData.currency,
      userId: transactionData.userId,
      merchantId: transactionData.merchantId,
      metadata: transactionData.metadata || {},

      // Case lifecycle tracking
      status: 'PROCESSING', // Will become 'COMPLETED' when Final Reviewer is done
      createdAt: timestamp,
      updatedAt: timestamp,

      // Final decision (filled in by Final Reviewer)
      finalDecision: null, // Will be 'APPROVE' or 'DENY'
      confidence: null, // 0-1 confidence score
      totalCost: 0, // Total spent on signals (e.g., $0.35)

      // Agent tracking
      currentAgent: 'Orchestrator',
      agentHistory: ['Orchestrator'],
    };

    await db.collection(COLLECTIONS.TRANSACTIONS).insertOne(caseDocument);

    console.log(`✅ [Orchestrator] Created case ${transactionData.transactionId}`);

    // Step 2: Log this action to the timeline
    const timelineStep = {
      transactionId: transactionData.transactionId,
      stepNumber: 1,
      agentName: 'Orchestrator',
      action: 'CASE_CREATED',
      timestamp,
      duration: 0, // Orchestrator is instant

      // What happened
      input: {
        transaction: transactionData,
      },
      output: {
        message: 'Case created successfully',
        nextAgent: 'Suspicion Agent',
      },

      // Metadata
      metadata: {
        caseStatus: 'PROCESSING',
      },
    };

    await db.collection(COLLECTIONS.AGENT_STEPS).insertOne(timelineStep);

    console.log(`📝 [Orchestrator] Logged timeline step 1`);

    // Step 3: Trigger Suspicion Agent (runs asynchronously)
    // We don't await this - let it run in the background
    // The UI will poll to see progress
    setImmediate(() => {
      runSuspicionAgent(transactionData).catch((error) => {
        console.error(`❌ [Orchestrator] Suspicion Agent failed:`, error);
      });
    });

    console.log(`🚀 [Orchestrator] Triggered Suspicion Agent for ${transactionData.transactionId}`);

    // Return the case
    return {
      success: true,
      transactionId: transactionData.transactionId,
      status: 'PROCESSING',
      message: 'Case created and Suspicion Agent triggered',
      recovered: false,
    };
  } catch (error) {
    console.error(`❌ [Orchestrator] Failed to create case:`, error);

    throw new Error(
      `Failed to create case: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Recover a stuck case by analyzing where the pipeline stopped
 * and resuming from the correct agent
 */
async function recoverCase(transactionId: string): Promise<{
  recovered: boolean;
  resumedFrom?: string;
  error?: string;
}> {
  const db = await getDatabase();

  try {
    // Get the case and its agent history
    const caseData = await db.collection(COLLECTIONS.TRANSACTIONS).findOne({ transactionId });

    if (!caseData) {
      return { recovered: false, error: 'Case not found' };
    }

    // Get all agent steps, sorted by step number (latest first)
    const agentSteps = await db
      .collection(COLLECTIONS.AGENT_STEPS)
      .find({ transactionId })
      .sort({ stepNumber: -1 })
      .toArray();

    if (agentSteps.length === 0) {
      console.log(`[Recovery] No agent steps found - starting from beginning`);
      // No steps yet - trigger from start
      setImmediate(() => {
        runSuspicionAgent({
          transactionId: caseData.transactionId,
          amount: caseData.amount,
          currency: caseData.currency,
          userId: caseData.userId,
          merchantId: caseData.merchantId,
          metadata: caseData.metadata,
        }).catch((error) => {
          console.error(`[Recovery] Suspicion Agent failed:`, error);
        });
      });

      await logRecoveryStep(transactionId, 'START', 'No prior steps - starting pipeline');

      return { recovered: true, resumedFrom: 'Suspicion Agent (fresh start)' };
    }

    // Get the latest agent step
    const latestStep = agentSteps[0];
    const lastAgent = latestStep.agentName;
    const lastAction = latestStep.action;

    console.log(`[Recovery] Last step: ${lastAgent} - ${lastAction}`);
    console.log(`[Recovery] Agent history: ${(caseData.agentHistory || []).join(' → ')}`);

    // Determine next agent based on the pipeline state
    let nextAgent: string | null = null;
    let triggerFunction: (() => void) | null = null;

    // Check based on agent history and last action
    const agentHistory = caseData.agentHistory || [];

    if (!agentHistory.includes('Suspicion Agent')) {
      // Suspicion agent never ran
      nextAgent = 'Suspicion Agent';
      triggerFunction = () => {
        runSuspicionAgent({
          transactionId: caseData.transactionId,
          amount: caseData.amount,
          currency: caseData.currency,
          userId: caseData.userId,
          merchantId: caseData.merchantId,
          metadata: caseData.metadata,
        }).catch((error) => {
          console.error(`[Recovery] Suspicion Agent failed:`, error);
        });
      };
    } else if (!agentHistory.includes('Policy Agent')) {
      // Policy agent never ran
      nextAgent = 'Policy Agent';
      triggerFunction = () => {
        runPolicyAgent(transactionId).catch((error) => {
          console.error(`[Recovery] Policy Agent failed:`, error);
        });
      };
    } else if (!agentHistory.includes('VOI/Budget Agent') && !agentHistory.includes('Buyer/Decision Agent')) {
      // Check if we need VOI or can skip to Buyer
      // If Policy Agent decided to skip signals (low risk), go to Buyer
      // Otherwise, go to VOI
      const policyStep = agentSteps.find(s => s.agentName === 'Policy Agent');
      const skipSignals = policyStep?.output?.decision === 'SKIP_SIGNALS';

      if (skipSignals) {
        nextAgent = 'Buyer/Decision Agent';
        triggerFunction = () => {
          runBuyerDecisionAgent(transactionId, []).catch((error) => {
            console.error(`[Recovery] Buyer Agent failed:`, error);
          });
        };
      } else {
        nextAgent = 'VOI/Budget Agent';
        triggerFunction = () => {
          runVOIAgent(transactionId).catch((error) => {
            console.error(`[Recovery] VOI Agent failed:`, error);
          });
        };
      }
    } else if (!agentHistory.includes('Buyer/Decision Agent')) {
      // VOI ran but Buyer didn't
      nextAgent = 'Buyer/Decision Agent';

      // Get purchase list from VOI decision
      const voiStep = agentSteps.find(s => s.agentName === 'VOI/Budget Agent');
      const purchaseList = voiStep?.output?.purchaseList || [];

      triggerFunction = () => {
        runBuyerDecisionAgent(transactionId, purchaseList).catch((error) => {
          console.error(`[Recovery] Buyer Agent failed:`, error);
        });
      };
    } else if (agentHistory.includes('Buyer/Decision Agent') && !agentHistory.includes('Debate Tribunal')) {
      // Buyer ran but debate might be incomplete
      // Check if final decision exists
      const hasFinalDecision = caseData.finalDecision !== null;

      if (!hasFinalDecision) {
        // Something went wrong in Buyer - re-run it
        nextAgent = 'Buyer/Decision Agent (retry)';

        const voiStep = agentSteps.find(s => s.agentName === 'VOI/Budget Agent');
        const purchaseList = voiStep?.output?.purchaseList || [];

        triggerFunction = () => {
          runBuyerDecisionAgent(transactionId, purchaseList).catch((error) => {
            console.error(`[Recovery] Buyer Agent retry failed:`, error);
          });
        };
      } else {
        // Already have final decision but status not updated
        // Mark as completed
        await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
          { transactionId },
          { $set: { status: 'COMPLETED', updatedAt: new Date() } }
        );

        await logRecoveryStep(transactionId, 'COMPLETION', 'Final decision exists - marked case as COMPLETED');

        return { recovered: true, resumedFrom: 'Already completed (status updated)' };
      }
    } else {
      // Case appears complete but status is wrong
      const hasFinalDecision = caseData.finalDecision !== null;

      if (hasFinalDecision) {
        await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
          { transactionId },
          { $set: { status: 'COMPLETED', updatedAt: new Date() } }
        );

        await logRecoveryStep(transactionId, 'COMPLETION', 'All agents completed - status corrected');

        return { recovered: true, resumedFrom: 'Already completed (status corrected)' };
      } else {
        return { recovered: false, error: 'Unable to determine recovery point' };
      }
    }

    if (nextAgent && triggerFunction) {
      console.log(`[Recovery] Resuming pipeline from: ${nextAgent}`);

      // Log recovery step
      await logRecoveryStep(transactionId, lastAgent, `Resuming from ${nextAgent} after ${lastAgent}`);

      // Trigger the next agent
      setImmediate(triggerFunction);

      return { recovered: true, resumedFrom: nextAgent };
    }

    return { recovered: false, error: 'Unable to determine next agent' };
  } catch (error) {
    console.error(`[Recovery] Error during recovery:`, error);
    return {
      recovered: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Log a SYSTEM_RECOVERED step to the timeline
 */
async function logRecoveryStep(
  transactionId: string,
  lastAgent: string,
  reason: string
) {
  const db = await getDatabase();

  try {
    // Get the next step number
    const lastStep = await db
      .collection(COLLECTIONS.AGENT_STEPS)
      .find({ transactionId })
      .sort({ stepNumber: -1 })
      .limit(1)
      .toArray();

    const nextStepNumber = lastStep.length > 0 ? lastStep[0].stepNumber + 1 : 1;

    const recoveryStep = {
      transactionId,
      stepNumber: nextStepNumber,
      agentName: 'System Recovery',
      action: 'SYSTEM_RECOVERED',
      timestamp: new Date(),
      duration: 0,

      input: {
        lastAgent,
        reason,
      },
      output: {
        message: 'Case recovery initiated - pipeline resumed',
        recoverySuccessful: true,
      },

      metadata: {
        isRecovery: true,
        systemAction: true,
      },
    };

    await db.collection(COLLECTIONS.AGENT_STEPS).insertOne(recoveryStep);

    console.log(`✅ [Recovery] Logged SYSTEM_RECOVERED step (${nextStepNumber})`);
  } catch (error) {
    console.error(`[Recovery] Failed to log recovery step:`, error);
  }
}

/**
 * DESIGN NOTES:
 *
 * 1. Why use setImmediate()?
 *    - L1 analysis might take 5-10 seconds (LLM calls)
 *    - We want to return to the user immediately
 *    - User sees "Case created" right away
 *    - UI polls to watch agent progress in real-time
 *
 * 2. Why step numbers?
 *    - Timeline is sequential: 1, 2, 3, 4...
 *    - Easy to sort and display in UI
 *    - Shows exact order of agent actions
 *
 * 3. Why separate input/output?
 *    - Input = what the agent received
 *    - Output = what the agent decided/produced
 *    - Makes debugging easier
 *    - Clear audit trail
 *
 * 4. Why agentHistory array?
 *    - Quick lookup: "Which agents touched this case?"
 *    - Useful for analytics: "How many cases needed L2?"
 *    - Aggregation queries: "Average cost by agent path"
 */
