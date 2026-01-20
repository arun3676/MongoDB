'use client';

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

interface Props {
  data: AgentPerformance[];
}

export default function PerformanceMetrics({ data }: Props) {
  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getLatencyColor = (ms: number) => {
    if (ms < 500) return 'text-emerald-600';
    if (ms < 2000) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSuccessColor = (rate: number) => {
    if (rate >= 95) return 'text-emerald-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-gray-100 p-12 text-center">
        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No Performance Data</p>
        <p className="text-gray-500 text-sm mt-2">Agent metrics will appear here once cases are processed.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-xl shadow-gray-200/20">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Agent Performance Metrics</h2>
        <p className="text-gray-500 text-sm font-medium">Latency percentiles, throughput, and success rates per agent</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Agent</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Executions</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg Latency</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">P50</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">P95</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">P99</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Success Rate</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cost/Decision</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Signals</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((agent) => (
              <tr key={agent.agentName} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <span className="text-lg">
                        {agent.agentName.includes('L1') ? '🔍' : 
                         agent.agentName.includes('L2') ? '🔬' :
                         agent.agentName.includes('Final') ? '⚖️' :
                         agent.agentName.includes('Orchestrator') ? '🎯' : '🤖'}
                      </span>
                    </div>
                    <span className="text-sm font-black text-gray-900">{agent.agentName}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-gray-900">{agent.totalExecutions}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-sm font-black ${getLatencyColor(agent.avgLatency)}`}>
                    {formatLatency(agent.avgLatency)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-gray-700">{formatLatency(agent.p50Latency)}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-gray-700">{formatLatency(agent.p95Latency)}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-gray-700">{formatLatency(agent.p99Latency)}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-sm font-black ${getSuccessColor(agent.successRate)}`}>
                    {agent.successRate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-gray-900">${agent.costPerDecision.toFixed(3)}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{agent.signalsPurchased}</span>
                    {agent.signalsPurchased > 0 && (
                      <span className="text-xs text-blue-600">💰</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Performance Insights */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Fastest Agent</div>
            <div className="text-lg font-black text-blue-900">
              {data.reduce((min, a) => (a.avgLatency < min.avgLatency ? a : min), data[0])?.agentName}
            </div>
            <div className="text-[10px] text-blue-600 font-bold mt-1">
              {formatLatency(data.reduce((min, a) => (a.avgLatency < min.avgLatency ? a : min), data[0])?.avgLatency || 0)}
            </div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
            <div className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Most Reliable</div>
            <div className="text-lg font-black text-emerald-900">
              {data.reduce((max, a) => (a.successRate > max.successRate ? a : max), data[0])?.agentName}
            </div>
            <div className="text-[10px] text-emerald-600 font-bold mt-1">
              {data.reduce((max, a) => (a.successRate > max.successRate ? a : max), data[0])?.successRate.toFixed(1)}% success
            </div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <div className="text-xs font-black text-purple-600 uppercase tracking-widest mb-1">Highest Throughput</div>
            <div className="text-lg font-black text-purple-900">
              {data.reduce((max, a) => (a.totalExecutions > max.totalExecutions ? a : max), data[0])?.agentName}
            </div>
            <div className="text-[10px] text-purple-600 font-bold mt-1">
              {data.reduce((max, a) => (a.totalExecutions > max.totalExecutions ? a : max), data[0])?.totalExecutions} executions
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
