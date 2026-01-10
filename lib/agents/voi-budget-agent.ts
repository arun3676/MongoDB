/**
 * VOI/BUDGET AGENT - Value of Information Analysis
 *
 * ROLE: Decides which fraud signals to purchase based on cost vs benefit
 *
 * WHAT IT DOES:
 * 1. Reads transaction, suspicion score, and budget from MongoDB
 * 2. Discovers available tools from x402 Bazaar
 * 3. Calculates VOI (Value of Information) for each tool
 * 4. Decides which tools to purchase (VOI > 0)
 * 5. Logs VOI decisions to budget collection
 * 6. Triggers Buyer Agent with purchase list
 *
 * VOI FORMULA:
 * VOI = (confidence_gain × expected_loss) - tool_cost
 *
 * EXAMPLE:
 * - Transaction: $10,000
 * - Suspicion Score: 0.7 (70% likely fraud)
 * - Expected Loss: $10,000 × 0.7 = $7,000
 * - Velocity Signal: Adds 20% confidence, costs $0.10
 *   VOI = (0.20 × $7,000) - $0.10 = $1,399.90 → BUY!
 * - Network Signal: Adds 15% confidence, costs $0.25
 *   VOI = (0.15 × $7,000) - $0.25 = $1,049.75 → BUY!
 *
 * WHY THIS DESIGN?
 * - Economic rationality: Only buy signals that add value
 * - Budget-aware: Respects remaining budget
 * - Explainable: Clear VOI calculation per tool
 * - Dynamic: Discovers tools instead of hardcoding
 */

import { getDatabase, COLLECTIONS } from '../mongodb';
import { runBuyerDecisionAgent } from './buyer-decision-agent';
import { callLLM } from '../fireworks';

/**
 * Run VOI/Budget Agent on a transaction
 */
export async function runVOIAgent(transactionId: string) {
  const db = await getDatabase();
  const startTime = Date.now();

  console.log(`\n💰 [VOI/Budget Agent] Analyzing value of information for ${transactionId}`);

  try {
    // Step 1: Read transaction and budget
    const transaction = await db.collection(COLLECTIONS.TRANSACTIONS).findOne({ transactionId });
    const budget = await db.collection(COLLECTIONS.BUDGET).findOne({ transactionId });

    if (!transaction || !budget) {
      throw new Error('Transaction or budget not found');
    }

    console.log(`   Amount: $${transaction.amount}`);
    console.log(`   Budget: $${budget.remainingBudget.toFixed(2)} remaining`);

    // Step 2: Get suspicion score from timeline
    const suspicionStep = await db.collection(COLLECTIONS.AGENT_STEPS).findOne({
      transactionId,
      agentName: 'Suspicion Agent',
    });

    const suspicionScore = suspicionStep?.output?.suspicionScore || 0.5;

    console.log(`   Suspicion: ${suspicionScore.toFixed(2)}`);

    // Step 3: Discover tools from x402 Bazaar
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3001';
    const discoveryUrl = `${baseUrl}/api/bazaar/discover?category=fraud_detection&maxPrice=${budget.remainingBudget}`;

    console.log(`   Querying Bazaar: ${discoveryUrl}`);

    const discoveryResponse = await fetch(discoveryUrl);

    if (!discoveryResponse.ok) {
      throw new Error(`Bazaar discovery failed: ${discoveryResponse.statusText}`);
    }

    const discoveryData = await discoveryResponse.json();
    const tools = discoveryData.tools || [];

    console.log(`   Discovered ${tools.length} tools`);

    // Log discovery to timeline
    await db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
      transactionId,
      stepNumber: 3, // VOI Agent is step 3
      agentName: 'VOI/Budget Agent',
      action: 'TOOL_DISCOVERY',
      timestamp: new Date(),
      duration: 0,

      input: {
        category: 'fraud_detection',
        maxPrice: budget.remainingBudget,
      },
      output: {
        toolsFound: tools.length,
        tools: tools.map((t: any) => ({
          name: t.name,
          price: t.price,
          capabilities: t.capabilities,
        })),
      },

      metadata: {
        bazaarUrl: discoveryUrl,
      },
    });

    // Step 4: Calculate VOI for each tool (with negotiation support)
    const voiDecisions = [];
    const purchaseList: Array<{ signalType: string; proposedPrice?: number; negotiationPitch?: string }> = [];
    let economicRefusalCount = 0;

    for (const tool of tools) {
      const voi = calculateVOI(transaction, tool, suspicionScore);

      let decision: 'BUY' | 'SKIP' | 'NEGOTIATE' = voi.voi > 0 ? 'BUY' : 'SKIP';
      let proposedPrice: number | undefined;
      let negotiationPitch: string | undefined;

      // If VOI is negative but close to zero, consider negotiation
      if (voi.voi < 0 && voi.voi > -tool.price * 0.5) {
        const negotiation = await generateNegotiation(transaction, tool, voi, suspicionScore);
        if (negotiation.shouldNegotiate) {
          decision = 'NEGOTIATE';
          proposedPrice = negotiation.proposedPrice;
          negotiationPitch = negotiation.pitch;
        } else {
          decision = 'SKIP';
          economicRefusalCount++;
        }
      } else if (voi.voi < 0) {
        economicRefusalCount++;
      }

      console.log(`   ${tool.name}: VOI=$${voi.voi.toFixed(2)} → ${decision}`);

      voiDecisions.push({
        timestamp: new Date(),
        agent: 'VOI/Budget Agent',
        toolConsidered: tool.name,
        toolCost: tool.price,
        expectedLoss: voi.expectedLoss,
        confidenceGain: voi.confidenceGain,
        voi: voi.voi,
        voiScore: voi.voi, // Explicit VOI score for transparency
        decision,
        reasoning: voi.reasoning,
      });

      if (decision === 'BUY' || decision === 'NEGOTIATE') {
        // Extract signal type from endpoint (e.g., /api/signals/velocity → velocity)
        const signalType = tool.endpoint.split('/').pop();
        if (signalType) {
          purchaseList.push({
            signalType,
            proposedPrice: decision === 'NEGOTIATE' ? proposedPrice : undefined,
            negotiationPitch: decision === 'NEGOTIATE' ? negotiationPitch : undefined,
          });
        }
      }
    }

    if (economicRefusalCount > 0) {
      console.log(`   💼 Economic rationality preserved: ${economicRefusalCount} unprofitable signals rejected`);
    }

    console.log(`   Purchase list: ${purchaseList.map(p => p.signalType).join(', ') || 'none'}`);

    // Step 5: Update budget with VOI decisions
    await db.collection(COLLECTIONS.BUDGET).updateOne(
      { transactionId },
      {
        $push: { voiDecisions: { $each: voiDecisions } } as any,
        $set: { updatedAt: new Date() },
      }
    );

    // Step 6: Calculate estimated cost
    const estimatedCost = purchaseList.reduce((sum, purchase) => {
      const tool = tools.find((t: any) => t.endpoint.includes(purchase.signalType));
      // Use proposed price if negotiating, otherwise use tool price
      const cost = purchase.proposedPrice ?? tool?.price ?? 0;
      return sum + cost;
    }, 0);

    // Step 7: Log VOI analysis to timeline
    const totalToolsConsidered = tools.length;
    const toolsPurchased = purchaseList.length;
    const toolsSkipped = voiDecisions.filter((d: any) => d.decision === 'SKIP').length;
    const toolsRefused = economicRefusalCount;

    await db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
      transactionId,
      stepNumber: 4, // VOI analysis is step 4
      agentName: 'VOI/Budget Agent',
      action: 'VOI_ANALYSIS',
      timestamp: new Date(),
      duration: Date.now() - startTime,

      input: {
        toolsEvaluated: tools.length,
        suspicionScore,
        transactionAmount: transaction.amount,
        expectedLoss: transaction.amount * suspicionScore,
      },
      output: {
        voiDecisions,
        purchaseList,
        estimatedCost,
        budgetRemaining: budget.remainingBudget - estimatedCost,
        summary: {
          totalConsidered: totalToolsConsidered,
          purchased: toolsPurchased,
          skipped: toolsSkipped,
          economicRefusals: toolsRefused,
        },
      },

      metadata: {
        voiFormula: '(confidence_gain × expected_loss) - tool_cost',
        economicRationality: 'Signals rejected when cost exceeds expected loss',
        transparencyFeatures: {
          voiScoreStored: true,
          profitabilityCalculated: true,
          economicRefusalTracked: true,
        },
      },
    });

    console.log(`✅ [VOI/Budget Agent] Analysis complete`);

    // Step 8: Update transaction status
    await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
      { transactionId },
      {
        $set: {
          currentAgent: 'VOI/Budget Agent',
          updatedAt: new Date(),
        },
        $push: {
          agentHistory: 'VOI/Budget Agent' as any,
        },
      }
    );

    // Step 9: Trigger Buyer Agent with purchase list
    setImmediate(() => {
      runBuyerDecisionAgent(transactionId, purchaseList).catch((error) => {
        console.error(`❌ [VOI/Budget Agent] Buyer Agent failed:`, error);
      });
    });

    console.log(`🚀 [VOI/Budget Agent] Triggered Buyer/Decision Agent`);

    return {
      success: true,
      purchaseList,
      estimatedCost,
    };
  } catch (error) {
    console.error(`❌ [VOI/Budget Agent] Failed:`, error);

    throw new Error(
      `VOI/Budget Agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Calculate Value of Information for a tool
 *
 * VOI Formula:
 * VOI = (confidence_gain × expected_loss) - tool_cost
 *
 * Where:
 * - expected_loss = transaction_amount × fraud_probability (suspicion score)
 * - confidence_gain = estimated improvement from using this tool
 * - tool_cost = price of the signal
 */
function calculateVOI(
  transaction: any,
  tool: any,
  currentSuspicionScore: number
): {
  expectedLoss: number;
  confidenceGain: number;
  voi: number;
  reasoning: string;
} {
  // Expected loss if transaction is fraudulent
  const fraudProbability = currentSuspicionScore;
  const expectedLoss = transaction.amount * fraudProbability;

  // Confidence gain heuristic (based on tool type)
  // In production, this would be learned from historical data
  let confidenceGain = 0;

  if (tool.name.includes('Velocity')) {
    // Velocity signals typically add 20% confidence
    confidenceGain = 0.20;
  } else if (tool.name.includes('Network')) {
    // Network signals typically add 15% confidence
    confidenceGain = 0.15;
  } else {
    // Default: assume 10% confidence gain
    confidenceGain = 0.10;
  }

  // Calculate VOI
  const expectedValue = confidenceGain * expectedLoss;
  const voi = expectedValue - tool.price;

  // Generate reasoning
  let reasoning: string;

  if (voi > 0) {
    reasoning = `VOI=$${voi.toFixed(2)}: Expected value ($${expectedValue.toFixed(2)} = ${(confidenceGain * 100).toFixed(0)}% × $${expectedLoss.toFixed(2)}) exceeds cost ($${tool.price}). Purchasing this signal is economically justified.`;
  } else {
    reasoning = `VOI=$${voi.toFixed(2)}: Cost ($${tool.price}) exceeds expected value ($${expectedValue.toFixed(2)}). Signal not worth purchasing for this case.`;
  }

  return {
    expectedLoss,
    confidenceGain,
    voi,
    reasoning,
  };
}

/**
 * Generate a negotiation pitch for a signal purchase
 *
 * Uses LLM to create a reasoned argument for why the agent can't pay full price
 */
async function generateNegotiation(
  transaction: any,
  tool: any,
  voi: { voi: number; expectedLoss: number; confidenceGain: number },
  suspicionScore: number
): Promise<{
  shouldNegotiate: boolean;
  proposedPrice?: number;
  pitch?: string;
}> {
  try {
    // Calculate a proposed price (20-40% discount based on how negative the VOI is)
    const fullPrice = tool.price;
    const voiDeficit = Math.abs(voi.voi);

    // More negative VOI = bigger discount needed
    // Map VOI deficit to discount percentage (20-40%)
    let discountPercentage = 0.20; // Start at 20%
    if (voiDeficit > fullPrice * 0.5) {
      discountPercentage = 0.40; // Max 40% discount
    } else {
      discountPercentage = 0.20 + (voiDeficit / fullPrice) * 0.20; // Scale between 20-40%
    }

    const proposedPrice = Math.max(
      fullPrice * (1 - discountPercentage),
      0.01 // Minimum $0.01
    );

    // Use LLM to generate a reasoned negotiation pitch
    const systemPrompt = `You are an economic negotiator for a fraud detection AI agent. Your job is to generate persuasive, logical arguments for why a fraud signal should be purchased at a discounted price.

You must be SPECIFIC and QUANTITATIVE in your reasoning. Explain the economic constraints and value proposition clearly.`;

    const userPrompt = `Generate a negotiation pitch for purchasing a fraud detection signal at a discounted price.

TRANSACTION DETAILS:
- Transaction Amount: $${transaction.amount.toFixed(2)}
- Suspicion Score: ${(suspicionScore * 100).toFixed(0)}% (${suspicionScore < 0.5 ? 'LOW' : suspicionScore < 0.7 ? 'MEDIUM' : 'HIGH'} risk)
- Expected Loss if Fraudulent: $${voi.expectedLoss.toFixed(2)}

SIGNAL DETAILS:
- Signal Name: ${tool.name}
- Full Price: $${fullPrice.toFixed(2)}
- Expected Confidence Gain: ${(voi.confidenceGain * 100).toFixed(0)}%
- Value of Information (VOI): $${voi.voi.toFixed(2)} (NEGATIVE - not economically justified at full price)

PROPOSED PRICE: $${proposedPrice.toFixed(2)} (${(discountPercentage * 100).toFixed(0)}% discount)

Generate a concise negotiation pitch (2-3 sentences) explaining why:
1. The full price doesn't make economic sense for this specific transaction
2. The proposed discounted price is fair and mutually beneficial
3. The signal still provides value at the lower price

Return JSON in this format:
{
  "pitch": "Your 2-3 sentence negotiation pitch here",
  "shouldNegotiate": true
}

Be SPECIFIC about the numbers. For example, mention that "this $${transaction.amount} transaction" or "a $${fullPrice} signal eats ${((fullPrice / transaction.amount) * 100).toFixed(0)}% of the transaction value."`;

    const response = await callLLM<{
      pitch: string;
      shouldNegotiate: boolean;
    }>(systemPrompt, userPrompt, { type: 'json_object' });

    return {
      shouldNegotiate: response.shouldNegotiate,
      proposedPrice: response.shouldNegotiate ? proposedPrice : undefined,
      pitch: response.pitch,
    };
  } catch (error) {
    console.error('Negotiation generation failed:', error);
    // Fallback: don't negotiate if LLM fails
    return {
      shouldNegotiate: false,
    };
  }
}

/**
 * DESIGN NOTES:
 *
 * 1. Why VOI instead of always buying all signals?
 *    - Cost efficiency: Only buy what adds value
 *    - Explainability: Clear economic rationale
 *    - Scalability: Works with 100s of available signals
 *    - Real-world constraint: Budgets matter in production
 *
 * 2. Why heuristic confidence gains?
 *    - Simplicity: No need for complex ML models
 *    - Transparency: Easy to understand and audit
 *    - Tunable: Can be adjusted based on historical data
 *    - Good enough: Demonstrates the concept
 *
 * 3. Why query Bazaar instead of hardcoding?
 *    - Demonstrates tool discovery
 *    - Allows new signals to be added without code changes
 *    - Shows dynamic decision making
 *    - Aligns with hackathon judging criteria
 *
 * 4. Why pass purchase list to Buyer Agent?
 *    - Separation of concerns: VOI decides what, Buyer executes how
 *    - VOI doesn't know about CDP wallets or x402 flow
 *    - Buyer can batch purchases if needed
 *    - Clear responsibility boundaries
 */
