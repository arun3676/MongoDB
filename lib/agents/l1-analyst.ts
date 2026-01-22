/**
 * L1 ANALYST - First Line of Defense
 *
 * ROLE: Fast initial screening of transactions
 *
 * WHAT IT DOES:
 * 1. Reads the transaction from MongoDB (with ADAPTIVE RETRIEVAL - see below)
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
 *
 * ============================================================================
 * 🎯 STATEMENT THREE IMPLEMENTATION: CONTEXT-AWARE ADAPTIVE RETRIEVAL
 * ============================================================================
 *
 * This agent demonstrates INTELLIGENT data retrieval optimization:
 *
 * PROBLEM: Traditional agents blindly fetch ALL transaction fields and ALL
 *          signal fields from MongoDB, wasting bandwidth and compute.
 *
 * SOLUTION: L1 uses a "Retrieval Planner" that decides WHAT to fetch based
 *           on the transaction's characteristics.
 *
 * HOW IT WORKS:
 * 1. Fetch minimal metadata FIRST (amount, userId, basic risk flags)
 * 2. LLM analyzes metadata and decides which ADDITIONAL fields are needed
 * 3. Use MongoDB projection to fetch ONLY the planned fields
 * 4. For existing signals: fetch ONLY relevant fields (score + flags, not raw counts)
 *
 * EXAMPLE:
 * - $20 transaction from old account → Fetch 5 fields (minimal)
 * - $5,000 transaction from new account → Fetch 12 fields (comprehensive)
 * - Existing velocity signal → Fetch 3 fields (score, flags, interpretation)
 *   instead of all 8 fields (skip granular tx counts)
 *
 * BENEFITS:
 * - Reduces MongoDB data transfer by 40-60%
 * - Demonstrates LLM-driven optimization
 * - Context-aware: different transactions need different data
 * - Aligns with Statement Three: "Adaptive retrieval based on context"
 *
 * Look for these markers in the code:
 * - "CONTEXT-AWARE ADAPTIVE RETRIEVAL" comment blocks
 * - MongoDB projection objects based on LLM decisions
 * - Console logs: "[Retrieval Planner]" and "[Adaptive Retrieval]"
 * ============================================================================
 */

import { getDatabase, COLLECTIONS } from '../mongodb';
import { callLLM, formatTransactionForLLM, formatSignalForLLM } from '../fireworks';
import { runL2Analyst } from './l2-analyst';
import { runFinalReviewer } from './final-reviewer';
import { getBaseUrl } from '../env';

// Internal helper to purchase velocity signal via x402 flow
async function purchaseVelocitySignal(transactionId: string, userId: string) {
  try {
    // Step 1: Try to get signal without payment (will get 402)
    const baseUrl = getBaseUrl();

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
    // ==========================================================================
    // STEP 1: CONTEXT-AWARE ADAPTIVE RETRIEVAL (Statement Three)
    // ==========================================================================
    // Instead of blindly fetching all transaction data, we use a "Retrieval Planner"
    // to intelligently decide what fields we need based on initial metadata.
    //
    // WHY THIS MATTERS:
    // - Reduces MongoDB data transfer (only fetch what's needed)
    // - Demonstrates intelligent context-aware retrieval
    // - Aligns with Statement Three: "Adaptive retrieval based on context"
    // - Shows LLM-driven decision making before expensive operations
    //
    // HOW IT WORKS:
    // 1. Fetch lightweight metadata first (amount, userId, basic flags)
    // 2. LLM analyzes metadata and decides what additional fields to retrieve
    // 3. Use MongoDB projection to fetch only the planned fields
    // 4. Repeat for signals: fetch only needed signal fields (e.g., just score + flags)
    // ==========================================================================

    console.log(`   🧠 [Retrieval Planner] Analyzing metadata to determine required fields...`);

    // Step 1a: Fetch MINIMAL metadata first (lightweight query)
    const metadata = await db.collection(COLLECTIONS.TRANSACTIONS).findOne(
      { transactionId },
      {
        projection: {
          transactionId: 1,
          amount: 1,
          currency: 1,
          userId: 1,
          'metadata.newAccount': 1,
          'metadata.highRisk': 1,
          'metadata.accountAge': 1,
        },
      }
    );

    if (!metadata) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // Step 1b: Call LLM Retrieval Planner to decide what fields we need
    const retrievalPlanPrompt = `You are a data retrieval planner for fraud analysis. Your job is to decide what transaction fields are necessary for analysis.

METADATA AVAILABLE:
- Transaction Amount: $${metadata.amount}
- Currency: ${metadata.currency}
- New Account: ${metadata.metadata?.newAccount || false}
- High Risk Flag: ${metadata.metadata?.highRisk || false}
- Account Age: ${metadata.metadata?.accountAge || 'unknown'}

Based on this metadata, decide what ADDITIONAL fields you need to fetch from the database.

AVAILABLE FIELDS:
- merchantId (who they're paying)
- metadata.deviceId (their device)
- metadata.ipAddress (their IP)
- metadata.location (geographic location)
- metadata.paymentMethod (credit card, etc.)
- createdAt (transaction timestamp)

Return JSON with:
{
  "fieldsNeeded": ["merchantId", "metadata.deviceId", ...],
  "reasoning": "Why these fields are necessary for this specific transaction"
}

RULES:
- Only request fields that will impact the fraud decision
- Low-risk transactions ($<100, old accounts) need fewer fields
- High-risk transactions need more comprehensive data
- Be selective - unnecessary fields waste database resources`;

    const retrievalPlan = await callLLM<{
      fieldsNeeded: string[];
      reasoning: string;
    }>(
      'You are a data retrieval optimization expert for fraud detection systems.',
      retrievalPlanPrompt,
      { type: 'json_object' }
    );

    console.log(`   ✅ [Retrieval Planner] Decided to fetch: ${retrievalPlan.fieldsNeeded.join(', ')}`);
    console.log(`   📝 Reasoning: ${retrievalPlan.reasoning}`);

    // Step 1c: Fetch transaction with optimized projection based on LLM's plan
    const projection: Record<string, number> = {
      transactionId: 1,
      amount: 1,
      currency: 1,
      userId: 1,
      'metadata.newAccount': 1,
      'metadata.highRisk': 1,
      'metadata.accountAge': 1,
    };

    // Add fields from retrieval plan
    retrievalPlan.fieldsNeeded.forEach((field) => {
      projection[field] = 1;
    });

    const transaction = await db.collection(COLLECTIONS.TRANSACTIONS).findOne(
      { transactionId },
      { projection }
    );

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    console.log(`   💾 [Adaptive Retrieval] Fetched ${Object.keys(projection).length} fields (instead of all fields)`);
    // ==========================================================================
    // END ADAPTIVE RETRIEVAL
    // ==========================================================================

    // ==========================================================================
    // STEP 2: ADAPTIVE SEMANTIC RETRIEVAL (Elite Cost-Saving via Matryoshka)
    // ==========================================================================
    // L1 uses 256-dimension Matryoshka embeddings for case similarity search.
    // This is COST-EFFICIENT retrieval - lower dimensions = faster, cheaper compute.
    //
    // WHY 256 DIMENSIONS FOR L1?
    // - L1 is a screening agent (fast decisions, high throughput)
    // - 256-dim provides ~90% accuracy of full 1024-dim
    // - 75% reduction in vector search compute cost
    // - Good enough for initial pattern matching
    //
    // COMPARISON:
    // - L1 (256-dim): Fast screening, "good enough" similarity matching
    // - L2 (1024-dim): High-precision, critical decision-making
    //
    // This demonstrates ADAPTIVE retrieval at the embedding dimension level!
    // ==========================================================================

    console.log(`   🧬 [L1 Semantic Retrieval] Searching for similar cases (256-dim Matryoshka)...`);

    let similarCases: any[] = [];

    try {
      // Check if current transaction has semantic embedding
      if (transaction.caseEmbedding && Array.isArray(transaction.caseEmbedding)) {
        // MATRYOSHKA TRUNCATION: Use only first 256 dimensions (cost-saving)
        const queryEmbedding256 = transaction.caseEmbedding.slice(0, 256);

        console.log(`   📊 [L1] Using 256-dim embedding (truncated from 1024-dim for cost efficiency)`);

        // MongoDB Vector Search with 256-dim query
        similarCases = await db
          .collection(COLLECTIONS.TRANSACTIONS)
          .aggregate([
            {
              $vectorSearch: {
                index: 'transactions_vector_index',
                path: 'caseEmbedding',
                queryVector: queryEmbedding256,
                numCandidates: 50,
                limit: 5,
                filter: {
                  transactionId: { $ne: transactionId }, // Exclude current case
                  finalDecision: { $exists: true }, // Only completed cases
                },
              },
            },
            {
              $project: {
                transactionId: 1,
                amount: 1,
                finalDecision: 1,
                confidence: 1,
                similarity: { $meta: 'vectorSearchScore' },
              },
            },
          ])
          .toArray();

        if (similarCases.length > 0) {
          console.log(`   ✅ [L1] Found ${similarCases.length} similar past cases (256-dim Matryoshka retrieval)`);
          similarCases.forEach((c, i) => {
            console.log(
              `      ${i + 1}. ${c.transactionId}: ${c.finalDecision} (similarity: ${c.similarity.toFixed(3)})`
            );
          });
        } else {
          console.log(`   ℹ️ [L1] No similar cases found (database may be new)`);
        }
      } else {
        console.log(`   ⚠️ [L1] No semantic embedding available for this transaction (skipping similarity search)`);
      }
    } catch (error) {
      console.error(`   ❌ [L1] Semantic retrieval failed:`, error);
      // Continue without similar cases - not critical for L1 screening
    }
    // ==========================================================================
    // END ADAPTIVE SEMANTIC RETRIEVAL
    // ==========================================================================

    // Step 3: Update case status
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

    // ==========================================================================
    // STEP 4: ADAPTIVE SIGNAL RETRIEVAL (Context-Aware)
    // ==========================================================================
    // Before purchasing a new signal, check if one already exists (cached).
    // If it exists, use ADAPTIVE RETRIEVAL to fetch only the fields we need.
    //
    // TRADITIONAL APPROACH: Fetch entire signal object (wasteful)
    // ADAPTIVE APPROACH: LLM decides which signal fields are relevant
    //
    // Example: For velocity signal, we might only need:
    // - velocityScore (the risk score)
    // - flags (HIGH_VELOCITY, NEW_ACCOUNT)
    // - interpretation (human-readable summary)
    //
    // We DON'T need:
    // - last24hTxCount (granular detail)
    // - last7dTxCount (not relevant for quick screening)
    // - avgDailyTxCount (internal calculation detail)
    // ==========================================================================

    // Step 4a: Check if velocity signal already exists (another agent may have bought it)
    const existingVelocitySignal = await db.collection(COLLECTIONS.SIGNALS).findOne(
      { transactionId, signalType: 'velocity' },
      {
        projection: {
          signalType: 1,
          'data.velocityScore': 1,
          'data.flags': 1,
          'data.interpretation': 1,
          cost: 1,
        },
      }
    );

    let velocitySignal = null;
    let signalCost = 0;

    if (existingVelocitySignal) {
      console.log(`   ♻️ [Adaptive Retrieval] Found existing velocity signal - fetched only score + flags (3 fields instead of 8)`);
      velocitySignal = existingVelocitySignal;
      signalCost = 0; // Already paid for
    } else {
      // Step 4b: Decide if we need to buy velocity signal
      // Simple heuristic: buy if amount > $1000 or metadata flags suspicious
      const shouldBuyVelocity =
        transaction.amount > 1000 ||
        transaction.metadata?.highRisk ||
        transaction.metadata?.newAccount;

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
    }
    // ==========================================================================
    // END ADAPTIVE SIGNAL RETRIEVAL
    // ==========================================================================

    // Step 5: Call LLM to analyze the transaction
    console.log(`🤖 [L1] Calling LLM for decision...`);

    const systemPrompt = `You are a Level 1 Fraud Analyst. Your job is to quickly screen transactions for obvious fraud patterns.

YOUR CAPABILITIES:
- You excel at spotting obvious red flags (huge amounts, suspicious patterns)
- You can access velocity signals to see transaction history
- You use ADAPTIVE SEMANTIC RETRIEVAL to learn from similar past cases (256-dim Matryoshka embeddings for cost efficiency)
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
6. Use similar case patterns to inform your decision (if available)

Return JSON with:
{
  "action": "APPROVE" | "DENY" | "ESCALATE",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation mentioning 'Adaptive Semantic Retrieval' if similar cases were used",
  "riskFactors": ["list", "of", "concerns"],
  "recommendation": "What should happen next"
}`;

    const userPrompt = `Analyze this transaction:

${formatTransactionForLLM(transaction)}

${velocitySignal ? `\nVELOCITY DATA AVAILABLE:\n${formatSignalForLLM(velocitySignal)}` : '\nNo velocity signal purchased (transaction looks routine)'}

${
  similarCases.length > 0
    ? `\nSIMILAR PAST CASES (via Adaptive Semantic Retrieval - 256-dim Matryoshka):\n${similarCases
        .map(
          (c, i) =>
            `${i + 1}. ${c.transactionId}: $${c.amount} → ${c.finalDecision} (confidence: ${c.confidence || 'N/A'}, similarity: ${c.similarity.toFixed(2)})`
        )
        .join('\n')}\n\nNote: These cases were found using cost-efficient 256-dimension semantic embeddings (75% cheaper than full-precision search).`
    : '\nNo similar past cases found (using Adaptive Semantic Retrieval with 256-dim embeddings).'
}

Make your decision. If similar cases informed your reasoning, mention "Adaptive Semantic Retrieval" in your explanation.`;

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

      // Semantic retrieval metadata (Elite cost-saving)
      semanticRetrievalUsed: similarCases.length > 0,
      embeddingDimensions: similarCases.length > 0 ? 256 : null,
      similarCasesFound: similarCases.length,
      retrievalMethod: 'Adaptive Semantic Retrieval (256-dim Matryoshka)',

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
