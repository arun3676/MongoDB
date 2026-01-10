/**
 * x402 Bazaar - Tool Discovery Endpoint (with Semantic Search)
 *
 * Agents use this endpoint to discover available fraud detection tools.
 * Instead of hardcoding signal endpoints, agents query the Bazaar to find
 * tools that match their needs and budget.
 *
 * Query Parameters:
 * - category: Tool category (default: 'fraud_detection')
 * - maxPrice: Maximum price willing to pay (default: 999)
 * - query: Optional semantic search query (e.g., 'tools for account takeover')
 *
 * Returns:
 * - List of available tools with prices, capabilities, and endpoints
 * - If query provided: Tools ranked by semantic relevance (relevanceScore included)
 * - If no query: Tools sorted by price (cheapest first)
 *
 * Semantic Search:
 * - Uses Voyage-3 embeddings for natural language tool discovery
 * - Agents can describe what they need instead of knowing exact tool names
 * - Example: "detect rapid spending patterns" → Velocity Signal (0.89 relevance)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb';
import { getMatryoshkaEmbedding } from '@/lib/voyage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'fraud_detection';
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '999');
    const query = searchParams.get('query'); // Optional semantic search query

    console.log(
      `[Bazaar] Discovery request: category=${category}, maxPrice=${maxPrice}${
        query ? `, query="${query}"` : ''
      }`
    );

    const db = await getDatabase();
    let tools: any[] = [];
    let searchMethod = 'keyword';

    // SEMANTIC SEARCH (if query provided)
    if (query) {
      console.log(`[Bazaar] 🧠 Using semantic search via Voyage-3...`);

      try {
        // Generate 1024-dim embedding for the query
        const queryEmbedding = await getMatryoshkaEmbedding(query, 1024);

        if (queryEmbedding) {
          // Use MongoDB Atlas Vector Search with filters
          tools = await db
            .collection(COLLECTIONS.TOOL_METADATA)
            .aggregate([
              {
                $vectorSearch: {
                  index: 'vector_index', // Must be created in MongoDB Atlas UI
                  path: 'embedding',
                  queryVector: queryEmbedding,
                  numCandidates: 100,
                  limit: 10, // Return top 10 semantic matches
                  filter: {
                    category: { $eq: category },
                    enabled: { $eq: true },
                    price: { $lte: maxPrice },
                  },
                },
              },
              {
                $addFields: {
                  relevanceScore: { $meta: 'vectorSearchScore' },
                },
              },
            ])
            .toArray();

          searchMethod = 'semantic';
          console.log(
            `[Bazaar] ✅ Semantic search found ${tools.length} tools (ranked by relevance)`
          );
        } else {
          console.warn(`[Bazaar] ⚠️ Embedding generation failed, falling back to keyword search`);
        }
      } catch (error) {
        console.error(`[Bazaar] ❌ Semantic search error:`, error);
        console.log(`[Bazaar] Falling back to keyword search...`);
      }
    }

    // KEYWORD SEARCH (fallback or when no query)
    if (tools.length === 0) {
      console.log(`[Bazaar] Using keyword search (price-sorted)...`);

      tools = await db
        .collection(COLLECTIONS.TOOL_METADATA)
        .find({
          category,
          enabled: true,
          price: { $lte: maxPrice },
        })
        .sort({ price: 1 }) // Cheapest first
        .toArray();

      searchMethod = 'keyword';
    }

    console.log(`[Bazaar] Found ${tools.length} tools via ${searchMethod} search`);

    // Return discovery results
    return NextResponse.json({
      success: true,
      bazaar: 'x402 Fraud Signal Marketplace',
      searchMethod, // 'semantic' or 'keyword'
      category,
      maxPrice,
      query: query || null,
      toolsFound: tools.length,
      tools: tools.map((tool) => ({
        toolId: tool.toolId,
        name: tool.name,
        description: tool.description,
        price: tool.price,
        currency: tool.currency,
        endpoint: tool.endpoint,
        method: tool.method,
        capabilities: tool.capabilities,
        requiredParams: tool.requiredParams,
        provider: tool.provider,
        avgResponseTime: tool.avgResponseTime,
        ...(tool.relevanceScore !== undefined && { relevanceScore: tool.relevanceScore }), // Only include if semantic search
      })),
      _meta: {
        timestamp: new Date().toISOString(),
        queryParams: {
          category,
          maxPrice,
          query: query || null,
        },
        semanticSearchEnabled: !!query,
        embeddingModel: query ? 'voyage-3' : null,
      },
    });
  } catch (error) {
    console.error('[Bazaar] Discovery failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Tool discovery failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Example Usage (from agent perspective):
 *
 * // Example 1: Keyword search - Discover all fraud detection tools under $0.50
 * const response1 = await fetch('/api/bazaar/discover?category=fraud_detection&maxPrice=0.50');
 * const { tools } = await response1.json();
 *
 * // Result (sorted by price):
 * // [
 * //   {
 * //     toolId: 'tool_velocity_001',
 * //     name: 'Velocity Signal',
 * //     price: 0.10,
 * //     endpoint: '/api/signals/velocity',
 * //     capabilities: ['transaction_history', 'burst_detection'],
 * //     ...
 * //   },
 * //   {
 * //     toolId: 'tool_network_001',
 * //     name: 'Network Risk Signal',
 * //     price: 0.25,
 * //     endpoint: '/api/signals/network',
 * //     capabilities: ['graph_analysis', 'fraud_rings'],
 * //     ...
 * //   }
 * // ]
 *
 * // Example 2: Semantic search - Find tools by natural language query
 * const response2 = await fetch(
 *   '/api/bazaar/discover?query=tools%20for%20detecting%20rapid%20spending%20patterns&maxPrice=0.50'
 * );
 * const { tools: semanticTools, searchMethod } = await response2.json();
 *
 * // Result (ranked by semantic relevance):
 * // searchMethod: 'semantic'
 * // [
 * //   {
 * //     toolId: 'tool_velocity_001',
 * //     name: 'Velocity Signal',
 * //     price: 0.10,
 * //     relevanceScore: 0.89, // ← Semantic similarity score
 * //     endpoint: '/api/signals/velocity',
 * //     capabilities: ['transaction_history', 'burst_detection'],
 * //     ...
 * //   },
 * //   {
 * //     toolId: 'tool_network_001',
 * //     name: 'Network Risk Signal',
 * //     price: 0.25,
 * //     relevanceScore: 0.42,
 * //     endpoint: '/api/signals/network',
 * //     capabilities: ['graph_analysis', 'fraud_rings'],
 * //     ...
 * //   }
 * // ]
 *
 * // Example 3: Semantic search - Find tools for account takeover detection
 * const response3 = await fetch(
 *   '/api/bazaar/discover?query=detect%20account%20takeover%20and%20credential%20stuffing'
 * );
 * const { tools: atoTools } = await response3.json();
 * // Returns tools semantically related to account security threats
 */
