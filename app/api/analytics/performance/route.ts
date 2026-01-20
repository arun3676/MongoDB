import { NextResponse } from 'next/server';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb';

/**
 * Performance Analytics API
 * 
 * Returns comprehensive agent performance metrics including:
 * - Agent latency (avg, p50, p95, p99)
 * - Throughput (cases per hour)
 * - Success rates
 * - Cost per decision
 * - Signal purchase patterns
 * - Trend data for charts
 */

interface AgentPerformance {
  agentName: string;
  totalExecutions: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  successRate: number;
  totalCost: number;
  costPerDecision: number;
  signalsPurchased: number;
}

interface TrendDataPoint {
  date: string;
  cases: number;
  fraudPrevented: number;
  totalCost: number;
  avgLatency: number;
  approveRate: number;
  denyRate: number;
}

export async function GET() {
  try {
    const db = await getDatabase();
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ============================================================================
    // AGENT PERFORMANCE METRICS
    // ============================================================================
    const agentSteps = await db
      .collection(COLLECTIONS.AGENT_STEPS)
      .find({
        timestamp: { $gte: last24h },
        duration: { $exists: true, $ne: null },
      })
      .toArray();

    // Group by agent and calculate statistics
    const agentStats: Record<string, number[]> = {};
    const agentSuccess: Record<string, { success: number; total: number }> = {};

    agentSteps.forEach((step) => {
      const agent = step.agentName;
      if (!agent) return;

      if (!agentStats[agent]) {
        agentStats[agent] = [];
        agentSuccess[agent] = { success: 0, total: 0 };
      }

      if (step.duration && typeof step.duration === 'number') {
        agentStats[agent].push(step.duration);
      }

      agentSuccess[agent].total++;
      // Consider successful if no error in output
      if (!step.output?.error) {
        agentSuccess[agent].success++;
      }
    });

    // Calculate percentiles
    const calculatePercentile = (arr: number[], percentile: number): number => {
      const sorted = [...arr].sort((a, b) => a - b);
      const index = Math.ceil((sorted.length * percentile) / 100) - 1;
      return sorted[index] || 0;
    };

    const agentPerformance: AgentPerformance[] = Object.entries(agentStats).map(
      ([agentName, latencies]) => {
        const sorted = [...latencies].sort((a, b) => a - b);
        const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const success = agentSuccess[agentName] || { success: 0, total: 0 };

        // Get cost data for this agent
        const agentPayments = agentSteps.filter(
          (s) => s.agentName === agentName && s.metadata?.signalCost
        );
        const totalCost =
          agentPayments.reduce(
            (sum, s) => sum + (s.metadata?.signalCost || 0),
            0
          ) / 100; // Convert cents to dollars

        return {
          agentName,
          totalExecutions: latencies.length,
          avgLatency: Math.round(avg),
          p50Latency: calculatePercentile(sorted, 50),
          p95Latency: calculatePercentile(sorted, 95),
          p99Latency: calculatePercentile(sorted, 99),
          successRate: success.total > 0 ? (success.success / success.total) * 100 : 100,
          totalCost: Math.round(totalCost * 100) / 100,
          costPerDecision: latencies.length > 0 ? Math.round((totalCost / latencies.length) * 100) / 100 : 0,
          signalsPurchased: agentPayments.length,
        };
      }
    );

    // ============================================================================
    // SIGNAL PURCHASE ANALYTICS
    // ============================================================================
    const signals = await db
      .collection(COLLECTIONS.SIGNALS)
      .find({ purchasedAt: { $gte: last24h } })
      .toArray();

    const signalAnalytics = {
      totalPurchases: signals.length,
      velocityPurchases: signals.filter((s) => s.signalType === 'velocity').length,
      networkPurchases: signals.filter((s) => s.signalType === 'network').length,
      totalCost: signals.reduce((sum, s) => sum + (s.cost || 0), 0),
      avgCostPerSignal: signals.length > 0
        ? signals.reduce((sum, s) => sum + (s.cost || 0), 0) / signals.length
        : 0,
      purchasesByAgent: signals.reduce((acc, s) => {
        const agent = s.purchasedBy || 'Unknown';
        acc[agent] = (acc[agent] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    // ============================================================================
    // TREND DATA (Last 7 days for charts)
    // ============================================================================
    const completedCases = await db
      .collection(COLLECTIONS.TRANSACTIONS)
      .find({
        status: 'COMPLETED',
        createdAt: { $gte: last7d },
      })
      .toArray();

    // Group by day
    const dailyData: Record<string, TrendDataPoint> = {};
    const days = 7;
    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyData[dateStr] = {
        date: dateStr,
        cases: 0,
        fraudPrevented: 0,
        totalCost: 0,
        avgLatency: 0,
        approveRate: 0,
        denyRate: 0,
      };
    }

    completedCases.forEach((tx) => {
      const dateStr = new Date(tx.createdAt).toISOString().split('T')[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].cases++;
        if (tx.finalDecision === 'DENY') {
          dailyData[dateStr].fraudPrevented += tx.amount || 0;
        }
        dailyData[dateStr].totalCost += tx.totalCost || 0;
      }
    });

    // Calculate approval/denial rates
    Object.keys(dailyData).forEach((date) => {
      const dayCases = completedCases.filter(
        (tx) => new Date(tx.createdAt).toISOString().split('T')[0] === date
      );
      const approved = dayCases.filter((tx) => tx.finalDecision === 'APPROVE').length;
      const denied = dayCases.filter((tx) => tx.finalDecision === 'DENY').length;
      const total = dayCases.length;

      if (total > 0) {
        dailyData[date].approveRate = (approved / total) * 100;
        dailyData[date].denyRate = (denied / total) * 100;
      }
    });

    // Calculate average latency per day
    Object.keys(dailyData).forEach((date) => {
      const daySteps = agentSteps.filter(
        (step) => new Date(step.timestamp).toISOString().split('T')[0] === date
      );
      if (daySteps.length > 0) {
        const avgLatency =
          daySteps.reduce((sum, s) => sum + (s.duration || 0), 0) / daySteps.length;
        dailyData[date].avgLatency = Math.round(avgLatency);
      }
    });

    const trendData: TrendDataPoint[] = Object.values(dailyData).sort(
      (a, b) => a.date.localeCompare(b.date)
    );

    // ============================================================================
    // REAL-TIME ACTIVITY (Last 10 cases)
    // ============================================================================
    const recentCases = await db
      .collection(COLLECTIONS.TRANSACTIONS)
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    const recentActivity = recentCases.map((tx) => ({
      transactionId: tx.transactionId,
      status: tx.status,
      amount: tx.amount,
      finalDecision: tx.finalDecision,
      createdAt: tx.createdAt,
      totalCost: tx.totalCost || 0,
    }));

    // ============================================================================
    // SUMMARY STATS
    // ============================================================================
    const totalCases24h = await db
      .collection(COLLECTIONS.TRANSACTIONS)
      .countDocuments({ createdAt: { $gte: last24h } });

    const completedCases24h = await db
      .collection(COLLECTIONS.TRANSACTIONS)
      .countDocuments({
        status: 'COMPLETED',
        createdAt: { $gte: last24h },
      });

    const fraudPrevented24h = await db
      .collection(COLLECTIONS.TRANSACTIONS)
      .aggregate([
        {
          $match: {
            status: 'COMPLETED',
            finalDecision: 'DENY',
            createdAt: { $gte: last24h },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
      .toArray();

    const totalCost24h = await db
      .collection(COLLECTIONS.TRANSACTIONS)
      .aggregate([
        {
          $match: {
            status: 'COMPLETED',
            createdAt: { $gte: last24h },
          },
        },
        { $group: { _id: null, total: { $sum: '$totalCost' } } },
      ])
      .toArray();

    return NextResponse.json({
      success: true,
      data: {
        agentPerformance,
        signalAnalytics,
        trendData,
        recentActivity,
        summary: {
          totalCases24h,
          completedCases24h,
          fraudPrevented24h: fraudPrevented24h[0]?.total || 0,
          totalCost24h: totalCost24h[0]?.total || 0,
          throughput: completedCases24h, // cases per hour (approximate)
        },
      },
    });
  } catch (error) {
    console.error('[API] Analytics performance failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to compute performance analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
