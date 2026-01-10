/**
 * GET /api/case/:transactionId
 *
 * Get complete case details including timeline, signals, and decisions
 *
 * RESPONSE:
 * {
 *   "success": true,
 *   "transaction": { ... },          // Core transaction data
 *   "timeline": [ ... ],             // Agent steps (chronological)
 *   "signals": [ ... ],              // Purchased signals
 *   "decisions": [ ... ],            // Agent decisions
 *   "status": "PROCESSING|COMPLETED|FAILED",
 *   "finalDecision": "APPROVE|DENY|null",
 *   "totalCost": 0.35
 * }
 *
 * THIS IS THE MAIN ENDPOINT FOR THE UI
 * - Frontend polls this every 2 seconds
 * - Shows live agent progress
 * - Displays signal purchases
 * - Shows final decision when complete
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params;

    if (!transactionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing transactionId parameter',
        },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Fetch all data using aggregation pipeline
    // This joins data from multiple collections efficiently
    const result = await db
      .collection(COLLECTIONS.TRANSACTIONS)
      .aggregate([
        // Start with the transaction
        { $match: { transactionId } },

        // Lookup agent steps (timeline)
        {
          $lookup: {
            from: COLLECTIONS.AGENT_STEPS,
            localField: 'transactionId',
            foreignField: 'transactionId',
            as: 'timeline',
          },
        },

        // Lookup signals
        {
          $lookup: {
            from: COLLECTIONS.SIGNALS,
            localField: 'transactionId',
            foreignField: 'transactionId',
            as: 'signals',
          },
        },

        // Lookup decisions
        {
          $lookup: {
            from: COLLECTIONS.DECISIONS,
            localField: 'transactionId',
            foreignField: 'transactionId',
            as: 'decisions',
          },
        },

        // Sort timeline chronologically
        {
          $addFields: {
            timeline: {
              $sortArray: {
                input: '$timeline',
                sortBy: { stepNumber: 1 },
              },
            },
          },
        },

        // Sort decisions chronologically
        {
          $addFields: {
            decisions: {
              $sortArray: {
                input: '$decisions',
                sortBy: { timestamp: 1 },
              },
            },
          },
        },
      ])
      .toArray();

    // Case not found
    if (result.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Transaction ${transactionId} not found`,
        },
        { status: 404 }
      );
    }

    const caseData = result[0];

    // Find final decision from decisions array
    const finalDecisionRecord = caseData.decisions?.find(
      (d: any) => d.agentName === 'Final Reviewer' || d.isFinal === true
    );

    // Extract debate data from Buyer Decision agent's metadata
    const buyerDecision = caseData.decisions?.find(
      (d: any) => d.agentName === 'Buyer Decision'
    );

    const debateData = buyerDecision?.metadata?.debateResult ? {
      defense: buyerDecision.metadata.debateResult.defense,
      prosecution: buyerDecision.metadata.debateResult.prosecution,
      verdict: buyerDecision.metadata.debateResult.verdict
    } : null;

    // Build finalDecision object for UI (only if status is COMPLETED)
    const finalDecisionObj =
      caseData.status === 'COMPLETED' && (caseData.finalDecision || finalDecisionRecord)
        ? {
            decision: (caseData.finalDecision || finalDecisionRecord?.decision || finalDecisionRecord?.decisionType) as 'APPROVE' | 'DENY',
            confidence: caseData.confidence ?? finalDecisionRecord?.confidence ?? 0.5,
            reasoning: finalDecisionRecord?.reasoning || 'Final decision made by Final Reviewer agent.',
            agentDecisionsCount: caseData.decisions?.length || 0,
            signalsCount: caseData.signals?.length || 0,
            totalCost: caseData.totalCost || 0,
            riskFactorsCount: finalDecisionRecord?.riskFactors?.length || 0,
          }
        : null;

    // Format response
    const response = {
      success: true,

      // Core transaction data
      transaction: {
        transactionId: caseData.transactionId,
        amount: caseData.amount,
        currency: caseData.currency,
        userId: caseData.userId,
        merchantId: caseData.merchantId,
        metadata: caseData.metadata,
        createdAt: caseData.createdAt,
        updatedAt: caseData.updatedAt,
        completedAt: caseData.completedAt,
      },

      // Case status
      status: caseData.status, // PROCESSING | COMPLETED | FAILED
      currentAgent: caseData.currentAgent,
      agentHistory: caseData.agentHistory,

      // Costs
      totalCost: caseData.totalCost || 0,

      // Timeline (sorted by stepNumber)
      timeline: caseData.timeline.map((step: any) => ({
        stepNumber: step.stepNumber,
        agentName: step.agentName,
        action: step.action,
        timestamp: step.timestamp,
        duration: step.duration,
        input: step.input,
        output: step.output,
        metadata: step.metadata,
      })),

      // Signals purchased (velocity, network)
      signals: caseData.signals.map((signal: any) => ({
        signalId: signal.signalId,
        signalType: signal.signalType,
        transactionId: signal.transactionId,
        userId: signal.userId,
        data: signal.data,
        cost: signal.cost,
        purchasedAt: signal.purchasedAt,
        purchasedBy: signal.purchasedBy,
        expiresAt: signal.expiresAt,
      })),

      // Agent decisions
      decisions: caseData.decisions.map((decision: any) => ({
        decisionId: decision.decisionId || decision._id?.toString() || `dec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        transactionId: decision.transactionId,
        agentName: decision.agentName || decision.agent,
        decision: decision.decision || decision.decisionType,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        riskFactors: decision.riskFactors || [],
        signalsUsed: decision.signalsUsed || [],
        signalCost: decision.signalCost || 0,
        model: decision.model,
        processingTime: decision.processingTime,
        timestamp: decision.timestamp,
        isFinal: decision.isFinal || false,
      })),

      // Final decision object (only when COMPLETED)
      finalDecision: finalDecisionObj,

      // Debate tribunal data (if available)
      debate: debateData,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Case retrieval failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve case',
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
 * // Fetch case status
 * const response = await fetch('/api/case/TX-1704556800-abc123');
 * const data = await response.json();
 *
 * console.log(data.status);          // "PROCESSING" or "COMPLETED"
 * console.log(data.timeline);        // [ step1, step2, step3, ... ]
 * console.log(data.finalDecision);   // "DENY" or null (if still processing)
 * console.log(data.totalCost);       // 0.35
 *
 * // Timeline example:
 * data.timeline.forEach(step => {
 *   console.log(`${step.agentName}: ${step.action}`);
 * });
 *
 * // Output:
 * // Orchestrator: CASE_CREATED
 * // L1 Analyst: ANALYSIS_STARTED
 * // L1 Analyst: SIGNAL_PURCHASED
 * // L1 Analyst: ANALYSIS_COMPLETED
 * // L2 Analyst: ANALYSIS_STARTED
 * // L2 Analyst: SIGNAL_PURCHASED
 * // L2 Analyst: ANALYSIS_COMPLETED
 * // Final Reviewer: REVIEW_STARTED
 * // Final Reviewer: REVIEW_COMPLETED
 * ```
 *
 * DESIGN NOTES:
 *
 * 1. Why use aggregation pipeline?
 *    - Joins data from 4 collections in ONE database query
 *    - Much faster than multiple queries
 *    - MongoDB is optimized for this
 *
 * 2. Why return timeline sorted?
 *    - UI can display steps in order: 1 → 2 → 3 → ...
 *    - Shows clear progression
 *    - No frontend sorting needed
 *
 * 3. Why include everything?
 *    - UI needs complete picture
 *    - One endpoint = all data
 *    - Reduces API calls (less polling overhead)
 *
 * 4. Why map/format response?
 *    - Clean data structure
 *    - Only send what UI needs
 *    - Hide internal MongoDB _id fields
 */
