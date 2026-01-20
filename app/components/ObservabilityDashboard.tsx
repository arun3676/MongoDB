'use client';

import { useEffect, useState } from 'react';
import PerformanceMetrics from './PerformanceMetrics';
import CostAnalytics from './CostAnalytics';
import ActivityFeed from './ActivityFeed';
import TrendCharts from './TrendCharts';

interface AnalyticsData {
  agentPerformance: Array<{
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
  }>;
  signalAnalytics: {
    totalPurchases: number;
    velocityPurchases: number;
    networkPurchases: number;
    totalCost: number;
    avgCostPerSignal: number;
    purchasesByAgent: Record<string, number>;
  };
  trendData: Array<{
    date: string;
    cases: number;
    fraudPrevented: number;
    totalCost: number;
    avgLatency: number;
    approveRate: number;
    denyRate: number;
  }>;
  recentActivity: Array<{
    transactionId: string;
    status: string;
    amount: number;
    finalDecision?: string;
    createdAt: Date | string;
    totalCost: number;
  }>;
  summary: {
    totalCases24h: number;
    completedCases24h: number;
    fraudPrevented24h: number;
    totalCost24h: number;
    throughput: number;
  };
}

export default function ObservabilityDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/analytics/performance');
        if (!res.ok) throw new Error('Failed to fetch analytics');
        const response = await res.json();
        if (response.success) {
          setData(response.data);
          setError(null);
        } else {
          throw new Error(response.error || 'Failed to load analytics');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 5 seconds for real-time updates
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-gray-100 p-20 text-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Loading Analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-red-100 p-20 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-red-500 font-bold uppercase tracking-widest text-[10px] mb-2">Error</p>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-xl shadow-gray-200/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Real-Time Observability</p>
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Performance Analytics</h1>
            <p className="text-gray-500 font-medium text-sm mt-1">System-wide metrics, agent performance, and cost optimization insights.</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-gray-900">{data.summary.completedCases24h}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cases (24h)</div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
            <div className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">Fraud Prevented</div>
            <div className="text-2xl font-black text-blue-900">
              ${(data.summary.fraudPrevented24h / 1000).toFixed(1)}k
            </div>
            <div className="text-[10px] text-blue-600 font-bold mt-1">{data.summary.completedCases24h} cases</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 border border-emerald-200">
            <div className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">Total Cost</div>
            <div className="text-2xl font-black text-emerald-900">
              ${data.summary.totalCost24h.toFixed(2)}
            </div>
            <div className="text-[10px] text-emerald-600 font-bold mt-1">
              ${data.summary.totalCost24h > 0 ? (data.summary.fraudPrevented24h / data.summary.totalCost24h).toFixed(0) : 0}x ROI
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
            <div className="text-xs font-black text-purple-600 uppercase tracking-widest mb-2">Throughput</div>
            <div className="text-2xl font-black text-purple-900">{data.summary.throughput}</div>
            <div className="text-[10px] text-purple-600 font-bold mt-1">Cases completed</div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
            <div className="text-xs font-black text-orange-600 uppercase tracking-widest mb-2">Signal Purchases</div>
            <div className="text-2xl font-black text-orange-900">{data.signalAnalytics.totalPurchases}</div>
            <div className="text-[10px] text-orange-600 font-bold mt-1">
              ${data.signalAnalytics.totalCost.toFixed(2)} spent
            </div>
          </div>
        </div>
      </div>

      {/* Agent Performance */}
      <PerformanceMetrics data={data.agentPerformance} />

      {/* Cost Analytics */}
      <CostAnalytics signalAnalytics={data.signalAnalytics} />

      {/* Trend Charts */}
      <TrendCharts trendData={data.trendData} />

      {/* Activity Feed */}
      <ActivityFeed activities={data.recentActivity} />
    </div>
  );
}
