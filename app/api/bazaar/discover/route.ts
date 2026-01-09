/**
 * x402 Bazaar - Tool Discovery Endpoint
 *
 * Agents use this endpoint to discover available fraud detection tools.
 * Instead of hardcoding signal endpoints, agents query the Bazaar to find
 * tools that match their needs and budget.
 *
 * Query Parameters:
 * - category: Tool category (default: 'fraud_detection')
 * - maxPrice: Maximum price willing to pay (default: 999)
 *
 * Returns:
 * - List of available tools with prices, capabilities, and endpoints
 * - Sorted by price (cheapest first)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'fraud_detection';
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '999');

    console.log(`[Bazaar] Discovery request: category=${category}, maxPrice=${maxPrice}`);

    const db = await getDatabase();

    // Query tool_metadata collection for enabled tools within budget
    const tools = await db
      .collection(COLLECTIONS.TOOL_METADATA)
      .find({
        category,
        enabled: true,
        price: { $lte: maxPrice },
      })
      .sort({ price: 1 }) // Cheapest first
      .toArray();

    console.log(`[Bazaar] Found ${tools.length} tools`);

    // Return discovery results
    return NextResponse.json({
      success: true,
      bazaar: 'x402 Fraud Signal Marketplace',
      category,
      maxPrice,
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
      })),
      _meta: {
        timestamp: new Date().toISOString(),
        queryParams: {
          category,
          maxPrice,
        },
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
 * // Discover all fraud detection tools under $0.50
 * const response = await fetch('/api/bazaar/discover?category=fraud_detection&maxPrice=0.50');
 * const { tools } = await response.json();
 *
 * // Result:
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
 */
