/**
 * BUYER/DECISION AGENT - Final Authority
 *
 * ROLE: Executes signal purchases via CDP wallet and makes final decision
 *
 * WHAT IT DOES:
 * 1. Receives purchase list from VOI Agent
 * 2. Purchases each signal via x402 + CDP wallet (real on-chain payments)
 * 3. Updates budget after each purchase
 * 4. Calls LLM with ALL evidence (signals + decisions)
 * 5. Makes final APPROVE or DENY decision
 * 6. Updates transaction status to COMPLETED
 * 7. Case is done!
 *
 * WHY THIS DESIGN:
 * - Single responsibility: Only this agent handles payments
 * - CDP integration: Real blockchain transactions
 * - LLM reasoning: Uses all purchased signals for final call
 * - Override authority: Can contradict earlier agents if evidence is weak
 * - Complete audit trail: All purchases logged to MongoDB
 */

import { getDatabase, COLLECTIONS } from '../mongodb';
import { callLLM, formatTransactionForLLM, formatSignalForLLM } from '../fireworks';
import { triggerCustomerNotification } from './customer-notification-agent';

type VerificationContext = {
  sessionId: string;
  response: 'CONFIRMED' | 'DISPUTED';
  identityVerified?: boolean;
  channel?: 'sms' | 'email' | 'webhook' | 'web';
  receivedAt?: Date | string;
};

type BuyerDecisionOptions = {
  verificationContext?: VerificationContext;
};

/**
 * Run Buyer/Decision Agent on a transaction
 *
 * @param transactionId - Transaction ID
 * @param purchaseList - List of signals to purchase with optional negotiation data
 */
export async function runBuyerDecisionAgent(
  transactionId: string,
  purchaseList: Array<string | { signalType: string; proposedPrice?: number; negotiationPitch?: string }> = [],
  options: BuyerDecisionOptions = {}
) {
  const db = await getDatabase();
  const startTime = Date.now();

  console.log(`\n💰 [Buyer/Decision Agent] Processing ${transactionId}`);
  console.log(`   Purchase list: ${purchaseList.join(', ') || 'none (low-risk case)'}`);

  try {
    // Step 1: Read transaction and budget
    const transaction = await db.collection(COLLECTIONS.TRANSACTIONS).findOne({ transactionId });
    const budget = await db.collection(COLLECTIONS.BUDGET).findOne({ transactionId });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Step 2: Purchase signals via x402 + CDP wallet (with negotiation support)
    const purchasedSignals = [];
    let totalSpent = 0;

    for (const item of purchaseList) {
      try {
        // Handle both old format (string) and new format (object with negotiation)
        const signalType = typeof item === 'string' ? item : item.signalType;
        const proposedPrice = typeof item === 'object' ? item.proposedPrice : undefined;
        const negotiationPitch = typeof item === 'object' ? item.negotiationPitch : undefined;

        if (negotiationPitch) {
          console.log(`   Purchasing ${signalType} signal with negotiation...`);
          console.log(`   Proposed price: $${proposedPrice?.toFixed(2)}`);
        } else {
          console.log(`   Purchasing ${signalType} signal via CDP...`);
        }

        const signal = await purchaseSignalWithCDP(
          transactionId,
          transaction.userId,
          signalType,
          proposedPrice,
          negotiationPitch
        );

        if (signal) {
          purchasedSignals.push(signal);
          // Use actual paid amount from signal response
          const signalCost = signal.actualCost || signal.cost || (signalType === 'velocity' ? 0.10 : 0.25);
          totalSpent += signalCost;

          if (negotiationPitch && signal.negotiationOutcome) {
            console.log(`   ✅ Negotiation ${signal.negotiationOutcome.accepted ? 'ACCEPTED' : 'REJECTED'} - Paid $${signalCost.toFixed(2)}`);
          } else {
            console.log(`   ✅ Purchased ${signalType} for $${signalCost.toFixed(2)}`);
          }

          // Update budget
          if (budget) {
            await db.collection(COLLECTIONS.BUDGET).updateOne(
              { transactionId },
              {
                $inc: {
                  spentSoFar: signalCost,
                  [`spendByTool.${signalType}`]: signalCost,
                },
                $set: {
                  remainingBudget: budget.startingBudget - budget.spentSoFar - signalCost,
                  updatedAt: new Date(),
                },
              }
            );
          }
        }
      } catch (error) {
        console.error(`   ❌ Failed to purchase signal:`, error);
        // Continue with other signals even if one fails
      }
    }

    console.log(`   Total spent: $${totalSpent.toFixed(2)}`);

    // Step 3: Read ALL signals (including any purchased earlier + newly purchased)
    const allSignals = await db
      .collection(COLLECTIONS.SIGNALS)
      .find({ transactionId })
      .toArray();

    console.log(`   Total signals available: ${allSignals.length}`);

    // Step 4: Read ALL agent decisions
    const decisions = await db
      .collection(COLLECTIONS.DECISIONS)
      .find({ transactionId })
      .sort({ timestamp: 1 })
      .toArray();

    const suspicionStep = await db.collection(COLLECTIONS.AGENT_STEPS).findOne({
      transactionId,
      agentName: 'Suspicion Agent',
    });
    const suspicionScore =
      typeof suspicionStep?.output?.suspicionScore === 'number'
        ? suspicionStep.output.suspicionScore
        : null;

    const verificationContext = options.verificationContext;

    // Step 5: Synthesize final decision with LLM using all evidence
    console.log(`   🧠 Calling LLM for final decision synthesis...`);

    const systemPrompt = `You are the Buyer/Decision Agent. Make the FINAL APPROVE or DENY decision for a fraud case.

CONTEXT:
- You have all purchased signals (velocity, network, others)
- You have all prior agent decisions (L1/L2/Policy/VOI)
- You may have a customer verification response (YES/NO) that should inform the final call
- Minimize false negatives (do not let fraud through), but avoid unnecessary blocks when evidence is weak.

OUTPUT (JSON):
{
  "decision": "APPROVE" | "DENY",
  "confidence": number,          // 0.0 - 1.0
  "reasoning": string,
  "riskFactors": string[]        // key drivers for the decision
}`;

    const verificationSection = verificationContext
      ? `CUSTOMER VERIFICATION:
- Response: ${verificationContext.response}
- Identity Verified: ${verificationContext.identityVerified ? 'true' : 'false'}
- Channel: ${verificationContext.channel || 'unknown'}
- Received At: ${verificationContext.receivedAt || 'unknown'}`
      : 'CUSTOMER VERIFICATION: None';

    const userPrompt = `TRANSACTION:
${JSON.stringify(formatTransactionForLLM(transaction), null, 2)}

SIGNALS:
${JSON.stringify(allSignals.map(formatSignalForLLM), null, 2)}

PRIOR DECISIONS:
${JSON.stringify(decisions.map((d) => ({
  agentName: d.agentName,
  decision: d.decision,
  confidence: d.confidence,
  reasoning: d.reasoning,
  riskFactors: d.riskFactors,
})), null, 2)}

${verificationSection}

Make the final decision now.`;

    const llmDecision = await callLLM<{
      decision: 'APPROVE' | 'DENY';
      confidence: number;
      reasoning: string;
      riskFactors?: string[];
    }>(systemPrompt, userPrompt, { type: 'json_object' });

    console.log(
      `   ✅ Final decision: ${llmDecision.decision} (${Math.round((llmDecision.confidence || 0) * 100)}% confidence)`
    );

    const mediumConfidence =
      typeof llmDecision.confidence === 'number' &&
      llmDecision.confidence >= 0.55 &&
      llmDecision.confidence <= 0.8;
    const mediumSuspicion =
      typeof suspicionScore === 'number' && suspicionScore >= 0.4 && suspicionScore < 0.7;
    const shouldVerifyCustomer =
      !verificationContext && (mediumConfidence || mediumSuspicion);

    if (shouldVerifyCustomer) {
      const activeSession = await db
        .collection(COLLECTIONS.VERIFICATION_SESSIONS)
        .find({
          transactionId,
          status: { $in: ['PENDING', 'VERIFIED'] },
          expiresAt: { $gt: new Date() },
        })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray();

      let sessionId = activeSession[0]?.sessionId;
      if (!sessionId) {
        const notification = await triggerCustomerNotification(transactionId);
        sessionId = notification.sessionId;
      }

      await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
        { transactionId },
        {
          $set: {
            verificationRequired: true,
            verificationStatus: 'PENDING',
            currentAgent: 'Customer Notification Agent',
            updatedAt: new Date(),
          },
          $push: {
            agentHistory: 'Customer Notification Agent' as any,
          },
        }
      );

      await db.collection(COLLECTIONS.DECISIONS).insertOne({
        decisionId: `dec_buyer_verify_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        transactionId,
        agentName: 'Buyer/Decision Agent',
        decision: 'ESCALATE',
        confidence: llmDecision.confidence,
        reasoning: 'Medium-risk case. Requested customer verification before final decision.',
        riskFactors: llmDecision.riskFactors || [],
        signalsUsed: allSignals.map((s) => s.signalType),
        signalCost: totalSpent,
        timestamp: new Date(),
        isFinal: false,
        action: 'REQUEST_CUSTOMER_VERIFICATION',
      });

      await db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
        transactionId,
        stepNumber: await db.collection(COLLECTIONS.AGENT_STEPS).countDocuments({ transactionId }) + 1,
        agentName: 'Buyer/Decision Agent',
        action: 'VERIFICATION_REQUESTED',
        timestamp: new Date(),
        input: {
          confidence: llmDecision.confidence,
          suspicionScore,
          reason: 'Medium risk requires customer confirmation',
        },
        output: { sessionId },
      });

      // Complete transaction with decision even when verification is requested
      // Verification is a separate process - the decision should still be shown
      const existingTotalCost =
        typeof transaction.totalCost === 'number' ? transaction.totalCost : 0;
      const updatedTotalCost = existingTotalCost + totalSpent;

      await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
        { transactionId },
        {
          $set: {
            status: 'COMPLETED',
            finalDecision: llmDecision.decision,
            confidence: llmDecision.confidence,
            totalCost: updatedTotalCost,
            verificationRequired: true,
            verificationStatus: 'PENDING',
            updatedAt: new Date(),
            currentAgent: 'Buyer/Decision Agent',
          },
          $push: {
            agentHistory: 'Buyer/Decision Agent' as any,
          },
        }
      );

      // Log final decision (even with verification requested)
      await db.collection(COLLECTIONS.DECISIONS).insertOne({
        decisionId: `dec_buyer_verify_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        transactionId,
        agentName: 'Buyer/Decision Agent',
        decision: llmDecision.decision,
        confidence: llmDecision.confidence,
        reasoning: `${llmDecision.reasoning} (Customer verification requested for additional confirmation)`,
        riskFactors: llmDecision.riskFactors || [],
        signalsUsed: allSignals.map((s) => s.signalType),
        signalCost: totalSpent,
        totalCost: updatedTotalCost,
        timestamp: new Date(),
        isFinal: true,
        action: 'REQUEST_CUSTOMER_VERIFICATION',
        verificationSessionId: sessionId,
      });

      console.log(`   ✅ Final decision: ${llmDecision.decision} (${Math.round((llmDecision.confidence || 0) * 100)}% confidence)`);
      console.log(`   WARNING: Medium risk detected. Customer verification requested (session: ${sessionId}).`);

      return {
        success: true,
        verificationRequired: true,
        sessionId,
        decision: llmDecision.decision,
        confidence: llmDecision.confidence,
      };
    }

    const existingTotalCost =
      typeof transaction.totalCost === 'number' ? transaction.totalCost : 0;
    const updatedTotalCost = existingTotalCost + totalSpent;

    // Step 6: Update transaction to COMPLETED
    await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
      { transactionId },
      {
        $set: {
          status: 'COMPLETED',
          finalDecision: llmDecision.decision,
          confidence: llmDecision.confidence,
          totalCost: updatedTotalCost,
          updatedAt: new Date(),
          currentAgent: 'Buyer/Decision Agent',
        },
        $push: {
          agentHistory: 'Buyer/Decision Agent' as any,
        },
      }
    );

    // Step 7: Log final decision to decisions collection
    await db.collection(COLLECTIONS.DECISIONS).insertOne({
      decisionId: `dec_buyer_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      transactionId,
      agentName: 'Buyer/Decision Agent',
      decision: llmDecision.decision,
      confidence: llmDecision.confidence,
      reasoning: llmDecision.reasoning,
      riskFactors: llmDecision.riskFactors || [],
      signalsUsed: allSignals.map((s) => s.signalType),
      signalCost: totalSpent,
      totalCost: updatedTotalCost,
      timestamp: new Date(),
      isFinal: true,
      verificationContext: verificationContext || null,
    });

    // Step 8: Log final decision to timeline
    await db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
      transactionId,
      stepNumber: 99, // Final step
      agentName: 'Buyer/Decision Agent',
      action: 'FINAL_DECISION',
      timestamp: new Date(),
      duration: Date.now() - startTime,

      input: {
        purchaseList,
        signalsAvailable: allSignals.length,
        totalCost: updatedTotalCost,
      },
      output: {
        decision: llmDecision.decision,
        confidence: llmDecision.confidence,
        reasoning: llmDecision.reasoning,
        riskFactors: llmDecision.riskFactors,
      },

      metadata: {
        agentDecisionsReviewed: decisions.length,
        llmModel: 'llama-v3p3-70b-instruct',
      },
    });

    console.log(`✅ [Buyer/Decision Agent] Case ${transactionId} ${llmDecision.decision}`);

    return {
      success: true,
      decision: llmDecision.decision,
      confidence: llmDecision.confidence,
      totalCost: totalSpent,
    };
  } catch (error) {
    console.error(`❌ [Buyer/Decision Agent] Failed:`, error);

    throw new Error(
      `Buyer/Decision Agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Purchase a signal via x402 + CDP wallet (with negotiation support)
 */
async function purchaseSignalWithCDP(
  transactionId: string,
  userId: string,
  signalType: string,
  proposedPrice?: number,
  negotiationPitch?: string
): Promise<any> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3001';
  const fullPrice = signalType === 'velocity' ? 0.10 : 0.25;
  const paymentAmount = proposedPrice || fullPrice;

  // Step 1: Make CDP payment
  const paymentResponse = await fetch(`${baseUrl}/api/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: paymentAmount,
      signalType,
      transactionId,
      agentName: 'Buyer/Decision Agent',
      // Include negotiation data in payment record
      negotiation: negotiationPitch ? {
        fullPrice,
        proposedPrice: paymentAmount,
        pitch: negotiationPitch,
        timestamp: new Date().toISOString(),
      } : undefined,
    }),
  });

  if (!paymentResponse.ok) {
    const errorData = await paymentResponse.json();
    throw new Error(`CDP payment failed: ${errorData.error || paymentResponse.statusText}`);
  }

  const paymentData = await paymentResponse.json();
  const paymentProof = paymentData.paymentProof;

  console.log(`     Payment successful: ${paymentData.cdpTxHash?.substring(0, 10)}...`);

  // Step 2: Get signal with payment proof (and negotiation data if applicable)
  const signalUrl = new URL(`${baseUrl}/api/signals/${signalType}`);
  signalUrl.searchParams.set('userId', userId);
  signalUrl.searchParams.set('transactionId', transactionId);

  // Pass negotiation parameters in query string
  if (proposedPrice) {
    signalUrl.searchParams.set('proposedPrice', proposedPrice.toString());
  }
  if (negotiationPitch) {
    signalUrl.searchParams.set('negotiationPitch', negotiationPitch);
  }

  const signalResponse = await fetch(signalUrl.toString(), {
    headers: {
      'X-Payment-Proof': paymentProof,
      'X-Agent-Name': 'Buyer/Decision Agent',
    },
  });

  if (!signalResponse.ok) {
    throw new Error(`Signal fetch failed: ${signalResponse.statusText}`);
  }

  return await signalResponse.json();
}

/**
 * DESIGN NOTES:
 *
 * 1. Why only Buyer Agent handles payments?
 *    - Single Responsibility Principle
 *    - Clear audit trail: "Who paid for what?"
 *    - CDP wallet errors contained in one place
 *    - VOI Agent doesn't need CDP knowledge
 *
 * 2. Why LLM for final decision?
 *    - Complex reasoning needed
 *    - Weighs multiple signals + agent opinions
 *    - Can explain decisions in natural language
 *    - Final step = worth the LLM cost
 *
 * 3. Why continue on purchase failures?
 *    - Partial signals still useful
 *    - One CDP failure shouldn't block decision
 *    - Log errors for debugging
 *    - Make best decision with available data
 *
 * 4. Why isFinal: true in decisions collection?
 *    - Easily query final decision without sorting
 *    - UI can show "Final" badge
 *    - Aggregations can filter for final decisions
 *    - Audit queries: "Show me all final denials"
 */
