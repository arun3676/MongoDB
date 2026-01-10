/**
 * VOYAGE AI INTEGRATION - Embedding & Reranking
 *
 * This module provides communication bridge to Voyage AI for:
 * 1. Generating embeddings for transaction/signal data
 * 2. Reranking documents for retrieval optimization
 * 3. Matryoshka embeddings for cost-efficient vector storage
 *
 * WHY VOYAGE AI?
 * - State-of-the-art embeddings (voyage-3 model)
 * - Matryoshka representation learning (variable-dimension embeddings)
 * - Reranking API for improving retrieval results
 * - Cost-efficient: use 256-dim for storage, 1024-dim for precision
 *
 * MATRYOSHKA EMBEDDINGS:
 * - Generate 1024-dim embedding
 * - Truncate to 256-dim for storage (75% cost reduction)
 * - Preserve semantic meaning in smaller dimensions
 * - Perfect for fraud pattern matching where approximate search is fine
 *
 * RERANKING:
 * - Improves retrieval relevance by 30-40%
 * - Uses rerank-2.5 model (latest as of 2025)
 * - Takes query + documents → returns sorted by relevance
 *
 * USAGE EXAMPLE:
 * ```typescript
 * // Get full embedding
 * const embedding = await getEmbedding("High-risk transaction from new account");
 * // → [0.123, 0.456, ..., 0.789] (1024 dimensions)
 *
 * // Get cost-efficient Matryoshka embedding
 * const smallEmbedding = await getMatryoshkaEmbedding("Same text", 256);
 * // → [0.123, 0.456, ..., 0.321] (256 dimensions, semantically similar)
 *
 * // Rerank fraud cases by relevance
 * const reranked = await getRerankedResults(
 *   "Find cases with velocity fraud",
 *   ["Case A: network fraud", "Case B: velocity spike", "Case C: clean"]
 * );
 * // → [{ text: "Case B: velocity spike", score: 0.89 }, ...]
 * ```
 */

import { VoyageAIClient } from 'voyageai';

// ============================================================================
// CLIENT INITIALIZATION
// ============================================================================

let voyageClient: VoyageAIClient | null = null;

/**
 * Initialize Voyage AI client with API key from environment
 * Lazy initialization - only creates client when first needed
 */
function getVoyageClient(): VoyageAIClient {
  if (!voyageClient) {
    const apiKey = process.env.VOYAGE_API_KEY;

    if (!apiKey) {
      throw new Error(
        'VOYAGE_API_KEY not found in environment variables. Please add it to your .env file.'
      );
    }

    voyageClient = new VoyageAIClient({
      apiKey: apiKey,
    });

    console.log('✅ [Voyage AI] Client initialized successfully');
  }

  return voyageClient;
}

// ============================================================================
// EMBEDDING FUNCTIONS
// ============================================================================

/**
 * Generate embedding vector for text using Voyage AI
 *
 * @param text - Text to embed (transaction description, signal data, etc.)
 * @param model - Voyage model to use (default: 'voyage-3')
 * @returns Embedding vector (1024 dimensions for voyage-3)
 *
 * MODELS AVAILABLE:
 * - 'voyage-3' (latest, 1024-dim, best quality)
 * - 'voyage-3-lite' (512-dim, faster/cheaper)
 * - 'voyage-finance-2' (optimized for finance domain)
 *
 * ERROR HANDLING:
 * - Retries up to 3 times with exponential backoff
 * - Returns null on failure (agents can continue without embeddings)
 * - Logs errors for debugging
 */
export async function getEmbedding(
  text: string,
  model: string = 'voyage-3'
): Promise<number[] | null> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = getVoyageClient();

      // Validate input
      if (!text || text.trim().length === 0) {
        console.warn('[Voyage AI] Empty text provided for embedding');
        return null;
      }

      // Truncate text if too long (Voyage has token limits)
      const maxChars = 8000; // ~2000 tokens
      const truncatedText = text.length > maxChars ? text.slice(0, maxChars) : text;

      if (text.length > maxChars) {
        console.log(`[Voyage AI] Truncated text from ${text.length} to ${maxChars} chars`);
      }

      console.log(`[Voyage AI] Generating embedding (model: ${model}, attempt: ${attempt})...`);

      const startTime = Date.now();

      // Call Voyage AI API
      const response = await client.embed({
        input: truncatedText,
        model: model,
      });

      const duration = Date.now() - startTime;

      // Extract embedding from response
      if (!response.data || response.data.length === 0) {
        throw new Error('No embedding returned from Voyage AI');
      }

      const embedding = response.data[0]?.embedding;

      if (!embedding) {
        throw new Error('Embedding data is missing from response');
      }

      console.log(
        `✅ [Voyage AI] Embedding generated: ${embedding.length} dimensions in ${duration}ms`
      );

      return embedding;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      console.error(
        `❌ [Voyage AI] Embedding failed (attempt ${attempt}/${maxRetries}):`,
        lastError.message
      );

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`   Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries failed
  console.error(
    `❌ [Voyage AI] Failed to generate embedding after ${maxRetries} attempts. Agent will continue without embedding.`
  );
  console.error(`   Last error: ${lastError?.message}`);

  return null; // Return null instead of crashing
}

/**
 * Generate Matryoshka embedding with configurable dimensions
 *
 * WHAT ARE MATRYOSHKA EMBEDDINGS?
 * - Full model generates 1024-dim embedding
 * - First N dimensions preserve semantic meaning
 * - Can truncate to 256-dim with minimal quality loss
 * - 75% storage reduction (256 vs 1024 floats)
 *
 * WHEN TO USE:
 * - 1024-dim: Precision-critical tasks (exact fraud pattern matching)
 * - 512-dim: Balanced quality/cost
 * - 256-dim: High-volume storage (embedding millions of transactions)
 *
 * @param text - Text to embed
 * @param dimensions - Target dimensions (256, 512, or 1024)
 * @param model - Voyage model (default: 'voyage-3')
 * @returns Truncated embedding vector
 */
export async function getMatryoshkaEmbedding(
  text: string,
  dimensions: 256 | 512 | 1024 = 256,
  model: string = 'voyage-3'
): Promise<number[] | null> {
  try {
    // Get full embedding first
    const fullEmbedding = await getEmbedding(text, model);

    if (!fullEmbedding) {
      return null;
    }

    // Truncate to desired dimensions
    const truncated = fullEmbedding.slice(0, dimensions);

    console.log(
      `✂️ [Voyage AI] Matryoshka truncation: ${fullEmbedding.length} → ${dimensions} dims (${((1 - dimensions / fullEmbedding.length) * 100).toFixed(0)}% reduction)`
    );

    return truncated;
  } catch (error) {
    console.error('[Voyage AI] Matryoshka embedding failed:', error);
    return null;
  }
}

// ============================================================================
// RERANKING FUNCTIONS
// ============================================================================

/**
 * Rerank documents by relevance to query using Voyage AI rerank-2.5
 *
 * WHAT IS RERANKING?
 * - Initial search (embedding similarity) gets ~80% accuracy
 * - Reranking refines top results → 90%+ accuracy
 * - Cross-encoder model (more expensive but more accurate)
 *
 * USE CASE FOR FRAUD DETECTION:
 * - Query: "Find similar velocity fraud cases"
 * - Documents: [Case 1, Case 2, ..., Case 100]
 * - Rerank top 20 results by actual relevance
 *
 * @param query - Search query (what you're looking for)
 * @param documents - List of documents to rank (fraud cases, signals, etc.)
 * @param topK - Return top K results (default: 10)
 * @returns Reranked documents with relevance scores
 *
 * EXAMPLE OUTPUT:
 * [
 *   { text: "Case B: velocity spike...", score: 0.89, index: 1 },
 *   { text: "Case D: high velocity...", score: 0.76, index: 3 },
 *   { text: "Case A: network fraud...", score: 0.34, index: 0 }
 * ]
 */
export async function getRerankedResults(
  query: string,
  documents: string[],
  topK: number = 10
): Promise<Array<{ text: string; score: number; index: number }>> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = getVoyageClient();

      // Validate inputs
      if (!query || query.trim().length === 0) {
        console.warn('[Voyage AI] Empty query provided for reranking');
        return []; // Return empty array for consistency (invalid query = no results)
      }

      if (!documents || documents.length === 0) {
        console.warn('[Voyage AI] No documents provided for reranking');
        return []; // Return empty array (no documents = no results)
      }

      // Truncate documents if too long
      const maxChars = 2000;
      const truncatedDocs = documents.map((doc) =>
        doc.length > maxChars ? doc.slice(0, maxChars) : doc
      );

      console.log(
        `[Voyage AI] Reranking ${documents.length} documents (model: rerank-2.5, attempt: ${attempt})...`
      );

      const startTime = Date.now();

      // Call Voyage AI Rerank API
      const response = await client.rerank({
        query: query,
        documents: truncatedDocs,
        model: 'rerank-2.5',
        topK: Math.min(topK, documents.length),
      });

      const duration = Date.now() - startTime;

      // Parse results
      if (!response.data || response.data.length === 0) {
        console.warn('[Voyage AI] No reranking results returned');
        return [];
      }

      const rerankedResults = response.data
        .filter((result) => result.index !== undefined)
        .map((result) => ({
          text: documents[result.index!],
          score: (result as any).relevanceScore ?? (result as any).relevance_score ?? 0,
          index: result.index!,
        }));

      console.log(
        `✅ [Voyage AI] Reranked ${rerankedResults.length} documents in ${duration}ms`
      );

      if (rerankedResults.length > 0) {
        console.log(
          `   Top result: index ${rerankedResults[0].index}, score ${rerankedResults[0].score.toFixed(3)}`
        );
      }

      return rerankedResults;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      console.error(
        `❌ [Voyage AI] Reranking failed (attempt ${attempt}/${maxRetries}):`,
        lastError.message
      );

      // Exponential backoff
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`   Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries failed
  console.error(
    `❌ [Voyage AI] Failed to rerank after ${maxRetries} attempts. Returning documents in original order.`
  );
  console.error(`   Last error: ${lastError?.message}`);

  // Fallback: return documents in original order with dummy scores
  return documents.map((text, index) => ({
    text,
    score: 1 - index * 0.01, // Descending scores
    index,
  }));
}

// ============================================================================
// FRAUD-SPECIFIC HELPERS
// ============================================================================

/**
 * Embed a transaction for similarity search
 * Optimized for fraud detection use case
 *
 * @param transaction - Transaction object
 * @returns 256-dim Matryoshka embedding (cost-efficient for storage)
 */
export async function embedTransaction(transaction: {
  transactionId: string;
  amount: number;
  userId: string;
  merchantId: string;
  metadata?: Record<string, any>;
}): Promise<number[] | null> {
  try {
    // Format transaction as natural language text
    const text = `Transaction ${transaction.transactionId}:
      User ${transaction.userId} paid ${transaction.amount} to merchant ${transaction.merchantId}.
      ${transaction.metadata?.newAccount ? 'New account.' : 'Established account.'}
      ${transaction.metadata?.highRisk ? 'Flagged as high risk.' : ''}`;

    // Use 256-dim Matryoshka embedding for efficiency
    // (storing millions of transactions, need small vectors)
    return await getMatryoshkaEmbedding(text, 256, 'voyage-3');
  } catch (error) {
    console.error('[Voyage AI] Transaction embedding failed:', error);
    return null;
  }
}

/**
 * Embed a fraud signal for retrieval
 *
 * @param signal - Signal object (velocity, network, etc.)
 * @returns 256-dim Matryoshka embedding
 */
export async function embedSignal(signal: {
  signalType: string;
  data: Record<string, any>;
}): Promise<number[] | null> {
  try {
    // Format signal as natural language
    const text = `${signal.signalType} signal: ${JSON.stringify(signal.data)}`;

    return await getMatryoshkaEmbedding(text, 256, 'voyage-3');
  } catch (error) {
    console.error('[Voyage AI] Signal embedding failed:', error);
    return null;
  }
}

/**
 * Find similar fraud cases using embeddings + reranking
 *
 * @param query - Natural language query (e.g., "Find velocity fraud cases")
 * @param candidateCases - Array of case summaries to search through
 * @param topK - Number of results to return
 * @returns Top K most similar cases
 */
export async function findSimilarCases(
  query: string,
  candidateCases: string[],
  topK: number = 5
): Promise<Array<{ text: string; score: number; index: number }> | null> {
  try {
    // Step 1: Get query embedding (not needed for rerank, but useful for future hybrid search)
    // const queryEmbedding = await getEmbedding(query);

    // Step 2: Rerank candidates by relevance
    const reranked = await getRerankedResults(query, candidateCases, topK);

    return reranked;
  } catch (error) {
    console.error('[Voyage AI] Similar case search failed:', error);
    return null;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate cosine similarity between two embedding vectors
 * Useful for comparing transaction embeddings
 *
 * @param vecA - First embedding vector
 * @param vecB - Second embedding vector
 * @returns Similarity score (0-1, higher = more similar)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error(
      `Vector dimensions don't match: ${vecA.length} vs ${vecB.length}`
    );
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

  return similarity;
}

/**
 * Check if Voyage AI is configured and accessible
 * Useful for health checks
 */
export async function checkVoyageHealth(): Promise<boolean> {
  try {
    const testEmbedding = await getEmbedding('Health check test', 'voyage-3');
    return testEmbedding !== null && testEmbedding.length > 0;
  } catch (error) {
    console.error('[Voyage AI] Health check failed:', error);
    return false;
  }
}

// ============================================================================
// DESIGN NOTES
// ============================================================================
/**
 * WHY VOYAGE AI FOR FRAUD DETECTION?
 *
 * 1. DOMAIN SPECIFICITY:
 *    - voyage-finance-2 model trained on financial text
 *    - Better understanding of fraud terminology
 *    - Recognizes patterns like "velocity spike", "fraud ring", etc.
 *
 * 2. MATRYOSHKA EMBEDDINGS:
 *    - Store 256-dim vectors for millions of transactions (75% cost savings)
 *    - Use 1024-dim for precision tasks (final fraud decision)
 *    - Flexible dimension scaling based on use case
 *
 * 3. RERANKING:
 *    - Initial embedding search: fast but ~80% accuracy
 *    - Reranking: slower but 90%+ accuracy
 *    - Perfect for "find similar fraud cases" feature
 *
 * 4. ERROR RESILIENCE:
 *    - All functions return null on failure (don't crash agents)
 *    - Retry logic with exponential backoff
 *    - Fallback strategies (rerank returns original order if API fails)
 *
 * 5. PRODUCTION READY:
 *    - Lazy client initialization (only create when needed)
 *    - Comprehensive logging for debugging
 *    - Input validation (empty text, token limits)
 *    - Performance monitoring (duration logs)
 */
