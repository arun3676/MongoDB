/**
 * DEBATE AGENT - Adversarial Reasoning Pattern
 *
 * Creates natural drama through opposing AI arguments:
 * 1. Defense Agent: Argues FOR approval (finds legitimate explanations)
 * 2. Prosecution Agent: Argues AGAINST approval (finds fraud indicators)
 * 3. Arbiter Agent: Weighs both sides and delivers final verdict
 *
 * WHY THIS DESIGN?
 * - Creates "wow" moment for judges: AI literally argues with itself
 * - Showcases advanced LLM patterns (Fireworks AI judge alignment)
 * - Demonstrates multi-agent collaboration theme
 * - Produces more balanced, explainable decisions
 * - Defense finds false positives, Prosecution finds true positives
 */

import { callLLM, formatTransactionForLLM, formatSignalForLLM } from '../fireworks';
import { getDatabase, COLLECTIONS } from '../mongodb';
import { getRerankedResults } from '../voyage';

export interface DefenseArgument {
  position: 'APPROVE';
  confidence: number;
  reasoning: string;
  keyPoints: string[];
  mitigatingFactors: string[];
}

export interface ProsecutionArgument {
  position: 'DENY';
  confidence: number;
  reasoning: string;
  keyPoints: string[];
  aggravatingFactors: string[];
}

export interface ArbiterVerdict {
  decision: 'APPROVE' | 'DENY';
  confidence: number;
  reasoning: string;
  defenseStrength: number;
  prosecutionStrength: number;
  decidingFactors: string[];
}

export interface DebateResult {
  defenseArgument: DefenseArgument;
  prosecutionArgument: ProsecutionArgument;
  arbiterVerdict: ArbiterVerdict;
}

/**
 * Run the adversarial debate between Defense, Prosecution, and Arbiter agents
 */
export async function runDebateAgent(
  transactionId: string,
  signals: any[],
  previousDecisions: any[]
): Promise<DebateResult> {
  const db = await getDatabase();
  const startTime = Date.now();

  console.log(`\n⚖️  [Debate Agent] Starting adversarial tribunal for ${transactionId}`);

  // Get transaction details
  const transaction = await db.collection(COLLECTIONS.TRANSACTIONS).findOne({ transactionId });

  if (!transaction) {
    throw new Error(`Transaction ${transactionId} not found`);
  }

  // Prepare evidence package for both sides
  const evidence = {
    transaction: formatTransactionForLLM(transaction),
    signals: signals.length > 0
      ? signals.map((s) => formatSignalForLLM(s)).join('\n\n')
      : 'No signals purchased (low-risk case)',
    previousAgentDecisions: previousDecisions.length > 0
      ? previousDecisions
          .map((d) => `${d.agentName}: ${d.decision} (confidence: ${(d.confidence * 100).toFixed(0)}%)`)
          .join('\n')
      : 'No previous decisions',
  };

  console.log(`   Evidence prepared: ${signals.length} signals, ${previousDecisions.length} prior decisions`);

  // Run Defense and Prosecution in PARALLEL for faster execution
  console.log(`   Launching Defense and Prosecution arguments in parallel...`);

  const [defenseArgument, prosecutionArgument] = await Promise.all([
    generateDefenseArgument(evidence),
    generateProsecutionArgument(evidence),
  ]);

  console.log(`   🛡️  Defense: ${defenseArgument.confidence * 100}% confident in APPROVE`);
  console.log(`   ⚔️  Prosecution: ${prosecutionArgument.confidence * 100}% confident in DENY`);

  // ==========================================================================
  // VOYAGE RERANKER: Score Evidence Relevance (Elite Feature)
  // ==========================================================================
  // Before the Arbiter makes a decision, use Voyage Reranker to score how
  // relevant each side's evidence points are to the actual transaction data.
  //
  // WHY RERANKING?
  // - Defense and Prosecution may cite evidence that sounds good but isn't
  //   actually relevant to THIS specific transaction
  // - Reranker uses cross-encoder model (rerank-2.5) to score factual relevance
  // - Higher scores = evidence is more grounded in transaction data
  // - Arbiter can weight arguments by factual relevance, not just persuasiveness
  //
  // HOW IT WORKS:
  // 1. Collect all evidence points from both sides (keyPoints, factors)
  // 2. Create query from original transaction data (ground truth)
  // 3. Rerank evidence points by relevance to transaction
  // 4. Pass relevance scores to Arbiter for weighted decision
  // ==========================================================================

  console.log(`   🔍 [Voyage Reranker] Scoring evidence relevance against transaction data...`);

  // Collect all evidence points from both sides
  const defenseEvidencePoints = [
    defenseArgument.reasoning,
    ...(defenseArgument.keyPoints || []),
    ...(defenseArgument.mitigatingFactors || []),
  ];

  const prosecutionEvidencePoints = [
    prosecutionArgument.reasoning,
    ...(prosecutionArgument.keyPoints || []),
    ...(prosecutionArgument.aggravatingFactors || []),
  ];

  // Create query from original transaction data (the ground truth)
  const transactionQuery = `Transaction details: ${evidence.transaction}\n\nSignals: ${evidence.signals}`;

  // Rerank evidence points from both sides
  let defenseRerankScores: Array<{ text: string; score: number; index: number }> = [];
  let prosecutionRerankScores: Array<{ text: string; score: number; index: number }> = [];

  try {
    // Rerank Defense evidence
    if (defenseEvidencePoints.length > 0) {
      defenseRerankScores = await getRerankedResults(
        transactionQuery,
        defenseEvidencePoints,
        defenseEvidencePoints.length // Rerank all points
      );

      if (defenseRerankScores && defenseRerankScores.length > 0) {
        const avgDefenseScore =
          defenseRerankScores.reduce((sum, r) => sum + r.score, 0) / defenseRerankScores.length;
        console.log(
          `   ✅ [Voyage Reranker] Defense evidence relevance: ${(avgDefenseScore * 100).toFixed(1)}% (${defenseRerankScores.length} points)`
        );
      }
    }

    // Rerank Prosecution evidence
    if (prosecutionEvidencePoints.length > 0) {
      prosecutionRerankScores = await getRerankedResults(
        transactionQuery,
        prosecutionEvidencePoints,
        prosecutionEvidencePoints.length // Rerank all points
      );

      if (prosecutionRerankScores && prosecutionRerankScores.length > 0) {
        const avgProsecutionScore =
          prosecutionRerankScores.reduce((sum, r) => sum + r.score, 0) / prosecutionRerankScores.length;
        console.log(
          `   ✅ [Voyage Reranker] Prosecution evidence relevance: ${(avgProsecutionScore * 100).toFixed(1)}% (${prosecutionRerankScores.length} points)`
        );
      }
    }
  } catch (error) {
    console.error(`   ⚠️ [Voyage Reranker] Failed to rerank evidence:`, error);
    // Continue without rerank scores - Arbiter will proceed without them
  }

  // Calculate average relevance scores for each side
  const defenseAvgRelevance =
    defenseRerankScores && defenseRerankScores.length > 0
      ? defenseRerankScores.reduce((sum, r) => sum + r.score, 0) / defenseRerankScores.length
      : null;

  const prosecutionAvgRelevance =
    prosecutionRerankScores && prosecutionRerankScores.length > 0
      ? prosecutionRerankScores.reduce((sum, r) => sum + r.score, 0) / prosecutionRerankScores.length
      : null;

  // ==========================================================================
  // END VOYAGE RERANKER
  // ==========================================================================

  // Log both arguments to timeline (in parallel)
  const defenseStepTime = Date.now();
  const prosecutionStepTime = Date.now();

  await Promise.all([
    db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
      transactionId,
      stepNumber: 5,
      agentName: 'Defense Agent',
      action: 'DEFENSE_ARGUMENT',
      timestamp: new Date(defenseStepTime),
      duration: Date.now() - startTime,
      input: {
        role: 'Argue for APPROVAL',
        evidenceProvided: {
          signalCount: signals.length,
          previousDecisionCount: previousDecisions.length,
        },
      },
      output: defenseArgument,
      metadata: {
        debateRole: 'defense',
        llmModel: 'llama-v3p3-70b-instruct',
      },
    }),
    db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
      transactionId,
      stepNumber: 6,
      agentName: 'Prosecution Agent',
      action: 'PROSECUTION_ARGUMENT',
      timestamp: new Date(prosecutionStepTime),
      duration: Date.now() - startTime,
      input: {
        role: 'Argue for DENIAL',
        evidenceProvided: {
          signalCount: signals.length,
          previousDecisionCount: previousDecisions.length,
        },
      },
      output: prosecutionArgument,
      metadata: {
        debateRole: 'prosecution',
        llmModel: 'llama-v3p3-70b-instruct',
      },
    }),
  ]);

  // Arbiter sees BOTH arguments and decides (with Voyage Rerank scores)
  console.log(`   👨‍⚖️ Arbiter reviewing both arguments with Voyage Rerank relevance scores...`);

  const arbiterVerdict = await generateArbiterVerdict(
    evidence,
    defenseArgument,
    prosecutionArgument,
    defenseRerankScores,
    prosecutionRerankScores,
    defenseAvgRelevance,
    prosecutionAvgRelevance
  );

  console.log(`   👨‍⚖️ Arbiter verdict: ${arbiterVerdict.decision} (${(arbiterVerdict.confidence * 100).toFixed(0)}% confident)`);
  console.log(`      Defense strength: ${(arbiterVerdict.defenseStrength * 100).toFixed(0)}%`);
  console.log(`      Prosecution strength: ${(arbiterVerdict.prosecutionStrength * 100).toFixed(0)}%`);

  // Log arbiter verdict to timeline
  await db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
    transactionId,
    stepNumber: 7,
    agentName: 'Arbiter Agent',
    action: 'ARBITER_VERDICT',
    timestamp: new Date(),
    duration: Date.now() - startTime,
    input: {
      defensePosition: defenseArgument.reasoning.substring(0, 150) + '...',
      prosecutionPosition: prosecutionArgument.reasoning.substring(0, 150) + '...',
    },
    output: arbiterVerdict,
      metadata: {
        debateRole: 'arbiter',
        isFinal: true,
        llmModel: 'llama-v3p3-70b-instruct',
        voyageRerank: {
          defenseAvgRelevance: defenseAvgRelevance,
          prosecutionAvgRelevance: prosecutionAvgRelevance,
          rerankModel: 'rerank-2.5',
        },
      },
  });

  // Log debate decision to decisions collection
  await db.collection(COLLECTIONS.DECISIONS).insertOne({
    decisionId: `dec_debate_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    transactionId,
    agentName: 'Debate Tribunal',
    decision: arbiterVerdict.decision,
    confidence: arbiterVerdict.confidence,
    reasoning: arbiterVerdict.reasoning,
    riskFactors: prosecutionArgument.aggravatingFactors || [],
    mitigatingFactors: defenseArgument.mitigatingFactors || [],
    signalsUsed: signals.map((s) => s.signalType),
    timestamp: new Date(),
    isFinal: false, // Buyer agent makes final decision based on this
      metadata: {
        debateDetails: {
          defenseConfidence: defenseArgument.confidence,
          prosecutionConfidence: prosecutionArgument.confidence,
          defenseStrength: arbiterVerdict.defenseStrength,
          prosecutionStrength: arbiterVerdict.prosecutionStrength,
          decidingFactors: arbiterVerdict.decidingFactors,
          voyageRerank: {
            defenseAvgRelevance: defenseAvgRelevance,
            prosecutionAvgRelevance: prosecutionAvgRelevance,
            rerankModel: 'rerank-2.5',
          },
        },
      },
  });

  console.log(`✅ [Debate Agent] Tribunal complete: ${arbiterVerdict.decision}`);

  return {
    defenseArgument,
    prosecutionArgument,
    arbiterVerdict,
  };
}

/**
 * Generate the Defense argument (argues for APPROVAL)
 */
async function generateDefenseArgument(evidence: {
  transaction: string;
  signals: string;
  previousAgentDecisions: string;
}): Promise<DefenseArgument> {
  const systemPrompt = `You are the DEFENSE AGENT in a fraud detection tribunal.
Your role: Argue WHY this transaction should be APPROVED.

You MUST find legitimate explanations for any suspicious signals.
Be persuasive. Find mitigating factors. Challenge assumptions.

Even if the evidence looks bad, your job is to present the BEST case for approval.
Think like a defense attorney - find reasonable doubt.

Key strategies:
- High velocity? Maybe it's a power user or business account
- New account? First-time customers deserve a chance
- Large amount? Could be a legitimate high-value purchase
- Suspicious patterns? Look for innocent explanations

Return your argument as JSON with these exact fields.`;

  const userPrompt = `EVIDENCE TO DEFEND:
${evidence.transaction}

SIGNALS (find innocent explanations):
${evidence.signals}

PREVIOUS AGENTS SAID:
${evidence.previousAgentDecisions}

Argue for APPROVAL. Return JSON:
{
  "position": "APPROVE",
  "confidence": <number 0.0-1.0>,
  "reasoning": "<your persuasive argument for approval - 2-3 sentences>",
  "keyPoints": ["<point 1>", "<point 2>", "<point 3>"],
  "mitigatingFactors": ["<factor 1>", "<factor 2>"]
}`;

  const result = await callLLM<DefenseArgument>(systemPrompt, userPrompt, {
    type: 'json_object',
  });

  // Ensure position is always APPROVE (defense must argue for approval)
  return {
    position: 'APPROVE',
    confidence: result?.confidence || 0.5,
    reasoning: result?.reasoning || 'Defense argues for approval based on available evidence.',
    keyPoints: result?.keyPoints || ['Insufficient evidence for denial', 'Presumption of innocence'],
    mitigatingFactors: result?.mitigatingFactors || ['No confirmed fraud history'],
  };
}

/**
 * Generate the Prosecution argument (argues for DENIAL)
 */
async function generateProsecutionArgument(evidence: {
  transaction: string;
  signals: string;
  previousAgentDecisions: string;
}): Promise<ProsecutionArgument> {
  const systemPrompt = `You are the PROSECUTION AGENT in a fraud detection tribunal.
Your role: Argue WHY this transaction should be DENIED.

You MUST highlight every risk factor and suspicious pattern.
Be aggressive. Connect the dots. Show the fraud pattern.

Even if the transaction looks clean, your job is to present the STRONGEST case for denial.
Think like a prosecutor - build an airtight case.

Key strategies:
- Low velocity? Could be testing stolen card with small amounts first
- Established account? Account could be compromised
- Normal amount? Doesn't rule out fraud, look at other signals
- Missing signals? Lack of data itself is suspicious

Return your argument as JSON with these exact fields.`;

  const userPrompt = `EVIDENCE TO PROSECUTE:
${evidence.transaction}

SIGNALS (highlight every risk):
${evidence.signals}

PREVIOUS AGENTS SAID:
${evidence.previousAgentDecisions}

Argue for DENIAL. Return JSON:
{
  "position": "DENY",
  "confidence": <number 0.0-1.0>,
  "reasoning": "<your aggressive argument for denial - 2-3 sentences>",
  "keyPoints": ["<point 1>", "<point 2>", "<point 3>"],
  "aggravatingFactors": ["<factor 1>", "<factor 2>"]
}`;

  const result = await callLLM<ProsecutionArgument>(systemPrompt, userPrompt, {
    type: 'json_object',
  });

  // Ensure position is always DENY (prosecution must argue for denial)
  return {
    position: 'DENY',
    confidence: result?.confidence || 0.5,
    reasoning: result?.reasoning || 'Prosecution argues for denial based on risk factors.',
    keyPoints: result?.keyPoints || ['Suspicious patterns detected', 'Risk exceeds threshold'],
    aggravatingFactors: result?.aggravatingFactors || ['Elevated risk score'],
  };
}

/**
 * Generate the Arbiter verdict (weighs both sides, makes final call)
 * Now includes Voyage Rerank relevance scores for evidence weighting
 */
async function generateArbiterVerdict(
  evidence: {
    transaction: string;
    signals: string;
    previousAgentDecisions: string;
  },
  defense: DefenseArgument,
  prosecution: ProsecutionArgument,
  defenseRerankScores: Array<{ text: string; score: number; index: number }> = [],
  prosecutionRerankScores: Array<{ text: string; score: number; index: number }> = [],
  defenseAvgRelevance: number | null = null,
  prosecutionAvgRelevance: number | null = null
): Promise<ArbiterVerdict> {
  const systemPrompt = `You are the ARBITER AGENT - the final judge in this fraud tribunal.

You have heard both sides:
- DEFENSE argues for approval
- PROSECUTION argues for denial

**IMPORTANT: You have been provided with Rerank scores from Voyage AI (rerank-2.5 model) indicating the factual relevance of each side's evidence points to the actual transaction data.**

These relevance scores show how well-grounded each side's arguments are in the transaction facts:
- Higher relevance scores (closer to 1.0) = evidence is more factually relevant to THIS transaction
- Lower relevance scores (closer to 0.0) = evidence may be persuasive but less grounded in transaction data

**USE THESE SCORES TO WEIGH THE ARGUMENTS:**
- If one side has significantly higher relevance scores, their evidence is more factually grounded
- Prefer arguments with higher relevance scores - they're more likely to be accurate
- However, still consider argument quality, logic, and completeness

Your job: Weigh both arguments FAIRLY using:
1. Strength of each argument's logic
2. **Factual relevance scores from Voyage Reranker (CRITICAL)**
3. Quality of evidence cited by each side
4. Logical consistency of their reasoning
5. Risk vs benefit analysis
6. Cost of false positives (blocking legitimate users) vs false negatives (allowing fraud)

You must be IMPARTIAL. The better argument wins, regardless of position, but prioritize factually grounded evidence.

Return your verdict as JSON with these exact fields.`;

  const userPrompt = `THE CASE:
${evidence.transaction}

AVAILABLE SIGNALS:
${evidence.signals}

DEFENSE ARGUMENT (Argues for APPROVE):
Confidence: ${(defense.confidence * 100).toFixed(0)}%
Reasoning: ${defense.reasoning}
Key Points: ${defense.keyPoints?.join(', ') || 'None provided'}
Mitigating Factors: ${defense.mitigatingFactors?.join(', ') || 'None provided'}
${
  defenseAvgRelevance !== null
    ? `\n**VOYAGE RERANK RELEVANCE SCORE: ${(defenseAvgRelevance * 100).toFixed(1)}%**\nThis score indicates how factually relevant the Defense's evidence points are to the actual transaction data. Higher scores mean the evidence is more grounded in transaction facts.`
    : '\n**VOYAGE RERANK SCORES: Unavailable**'
}
${
  defenseRerankScores && defenseRerankScores.length > 0
    ? `\nDefense Evidence Point Relevance Scores:\n${defenseRerankScores
        .map((r, i) => `  ${i + 1}. ${r.text.substring(0, 100)}... → Relevance: ${(r.score * 100).toFixed(1)}%`)
        .join('\n')}`
    : ''
}

PROSECUTION ARGUMENT (Argues for DENY):
Confidence: ${(prosecution.confidence * 100).toFixed(0)}%
Reasoning: ${prosecution.reasoning}
Key Points: ${prosecution.keyPoints?.join(', ') || 'None provided'}
Aggravating Factors: ${prosecution.aggravatingFactors?.join(', ') || 'None provided'}
${
  prosecutionAvgRelevance !== null
    ? `\n**VOYAGE RERANK RELEVANCE SCORE: ${(prosecutionAvgRelevance * 100).toFixed(1)}%**\nThis score indicates how factually relevant the Prosecution's evidence points are to the actual transaction data. Higher scores mean the evidence is more grounded in transaction facts.`
    : '\n**VOYAGE RERANK SCORES: Unavailable**'
}
${
  prosecutionRerankScores && prosecutionRerankScores.length > 0
    ? `\nProsecution Evidence Point Relevance Scores:\n${prosecutionRerankScores
        .map((r, i) => `  ${i + 1}. ${r.text.substring(0, 100)}... → Relevance: ${(r.score * 100).toFixed(1)}%`)
        .join('\n')}`
    : ''
}

**INSTRUCTIONS:**
- Compare the Voyage Rerank relevance scores for both sides
- If one side has significantly higher relevance scores, their evidence is more factually grounded
- Use these scores to weight your decision - prefer factually grounded evidence
- Still consider argument quality and logic, but prioritize relevance scores

DELIVER YOUR VERDICT. Return JSON:
{
  "decision": "<APPROVE or DENY>",
  "confidence": <number 0.0-1.0>,
  "reasoning": "<your judgment explaining why one side prevailed - 2-3 sentences>",
  "defenseStrength": <number 0.0-1.0>,
  "prosecutionStrength": <number 0.0-1.0>,
  "decidingFactors": ["<factor 1>", "<factor 2>", "<factor 3>"]
}`;

  const result = await callLLM<ArbiterVerdict>(systemPrompt, userPrompt, {
    type: 'json_object',
  });

  // Validate and ensure proper structure
  const decision = result?.decision === 'APPROVE' ? 'APPROVE' : 'DENY';

  return {
    decision,
    confidence: result?.confidence || 0.5,
    reasoning: result?.reasoning || `Arbiter rules ${decision} after weighing both arguments.`,
    defenseStrength: result?.defenseStrength || 0.5,
    prosecutionStrength: result?.prosecutionStrength || 0.5,
    decidingFactors: result?.decidingFactors || ['Evidence weight', 'Argument quality'],
  };
}

/**
 * DESIGN NOTES:
 *
 * 1. Why adversarial debate?
 *    - Creates "wow" demo moment: AI literally argues with itself
 *    - Defense finds false positives (legitimate transactions flagged)
 *    - Prosecution finds true positives (actual fraud)
 *    - Arbiter balances both for optimal decision
 *
 * 2. Why parallel execution for Defense/Prosecution?
 *    - Faster demo: ~3 seconds instead of ~6 seconds
 *    - Neither needs the other's output
 *    - Only Arbiter needs both
 *
 * 3. Why separate timeline steps?
 *    - Shows debate progression in UI
 *    - Each argument auditable
 *    - Clear reasoning chain
 *
 * 4. Why confidence scores for each side?
 *    - Shows how strongly each argues their position
 *    - Arbiter can weight by confidence
 *    - UI can show strength comparison
 */
