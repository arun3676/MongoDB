/**
 * Fireworks AI Integration - The "Brain" of Our Agents
 *
 * WHY DO WE NEED THIS?
 * Our agents need to make decisions like:
 * - "Is this transaction suspicious?"
 * - "Should I escalate to the next level?"
 * - "Based on velocity + network signals, is this fraud?"
 *
 * A rule-based system would need thousands of if-statements.
 * An LLM can reason through complex patterns and edge cases.
 *
 * WHAT MODEL ARE WE USING?
 * - llama-v3p1-70b-instruct (70 billion parameters)
 * - Good balance of speed and reasoning
 * - Structured output support (returns JSON)
 */

import OpenAI from 'openai';

// Validate FIREWORKS_API_KEY before initializing client
if (!process.env.FIREWORKS_API_KEY) {
  throw new Error('Missing FIREWORKS_API_KEY in environment variables');
}

// Initialize Fireworks client (uses OpenAI-compatible API)
const fireworks = new OpenAI({
  apiKey: process.env.FIREWORKS_API_KEY,
  baseURL: 'https://api.fireworks.ai/inference/v1',
});

// The model we'll use for all agents
// Try different model names if one doesn't work
const MODEL = 'accounts/fireworks/models/llama-v3p3-70b-instruct'; // Updated to v3.3

/**
 * Call the LLM to analyze a fraud case
 *
 * @param systemPrompt - Defines the agent's role and expertise
 * @param userPrompt - The specific case data to analyze
 * @param responseFormat - Expected output structure (JSON schema)
 * @returns LLM's analysis as structured JSON
 */
export async function callLLM<T = any>(
  systemPrompt: string,
  userPrompt: string,
  responseFormat?: {
    type: 'json_object';
    schema?: any;
  }
): Promise<T> {
  try {
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    // Call Fireworks AI
    const response = await fireworks.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.3, // Lower = more deterministic (good for fraud detection)
      max_tokens: 2000,
      response_format: responseFormat || { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from LLM');
    }

    // Parse JSON response
    const parsed = JSON.parse(content);
    return parsed as T;
  } catch (error) {
    console.error('Fireworks AI error:', error);
    throw new Error(
      `LLM call failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Helper: Format transaction data for LLM consumption
 *
 * Converts raw transaction object into a clean, readable format
 * that the LLM can easily understand and analyze.
 */
export function formatTransactionForLLM(transaction: any): string {
  return `
TRANSACTION DETAILS:
- Transaction ID: ${transaction.transactionId}
- Amount: $${transaction.amount.toFixed(2)} ${transaction.currency}
- User ID: ${transaction.userId}
- Merchant ID: ${transaction.merchantId}
- Timestamp: ${transaction.timestamp}
- Status: ${transaction.status}

METADATA:
${JSON.stringify(transaction.metadata || {}, null, 2)}
  `.trim();
}

/**
 * Helper: Format signal data for LLM consumption
 *
 * Takes velocity or network signal and formats it into
 * human-readable text that highlights the important risk factors.
 */
export function formatSignalForLLM(signal: any): string {
  if (signal.signalType === 'velocity') {
    return `
VELOCITY SIGNAL (Cost: $${signal.cost}):
- Transactions last 24h: ${signal.data.last24hTxCount} (normal: ${signal.data.avgDailyTxCount}/day)
- Velocity Score: ${signal.data.velocityScore.toFixed(2)} (0=normal, 1=extreme)
- Account Age: ${signal.data.accountAgeHours} hours
- Risk Flags: ${signal.data.flags.join(', ') || 'None'}
- Assessment: ${signal.data.interpretation}
    `.trim();
  }

  if (signal.signalType === 'network') {
    return `
NETWORK SIGNAL (Cost: $${signal.cost}):
- Connected Users: ${signal.data.connectedUsers}
- Shared Devices: ${signal.data.sharedDevices}
- Shared IPs: ${signal.data.sharedIPs}
- Suspicious Connections: ${signal.data.suspiciousConnections}
- Network Risk Score: ${signal.data.networkRiskScore.toFixed(2)} (0=clean, 1=fraud ring)
- Risk Flags: ${signal.data.flags.join(', ') || 'None'}
- Assessment: ${signal.data.interpretation}

FLAGGED CONNECTIONS:
${signal.data.flaggedConnections.map((conn: any) =>
  `  - ${conn.userId} (${conn.relationship}, ${conn.riskLevel} risk, last seen ${conn.lastSeenDate})`
).join('\n') || '  None'}
    `.trim();
  }

  return JSON.stringify(signal, null, 2);
}

/**
 * Example Usage:
 *
 * const decision = await callLLM<{
 *   action: 'APPROVE' | 'DENY' | 'ESCALATE',
 *   confidence: number,
 *   reasoning: string
 * }>(
 *   "You are a Level 1 fraud analyst. Analyze transactions quickly.",
 *   "Transaction: $500 from user_123 to merchant_456...",
 *   { type: 'json_object' }
 * );
 *
 * console.log(decision.action); // "ESCALATE"
 * console.log(decision.confidence); // 0.75
 * console.log(decision.reasoning); // "High velocity detected..."
 */
