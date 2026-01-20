'use client';

interface Props {
  signalAnalytics: {
    totalPurchases: number;
    velocityPurchases: number;
    networkPurchases: number;
    totalCost: number;
    avgCostPerSignal: number;
    purchasesByAgent: Record<string, number>;
  };
}

export default function CostAnalytics({ signalAnalytics }: Props) {
  const velocityPercentage =
    signalAnalytics.totalPurchases > 0
      ? (signalAnalytics.velocityPurchases / signalAnalytics.totalPurchases) * 100
      : 0;
  const networkPercentage =
    signalAnalytics.totalPurchases > 0
      ? (signalAnalytics.networkPurchases / signalAnalytics.totalPurchases) * 100
      : 0;

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-xl shadow-gray-200/20">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Cost Analytics</h2>
        <p className="text-gray-500 text-sm font-medium">Signal purchase patterns and cost optimization insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Signal Type Breakdown */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
          <div className="text-xs font-black text-gray-600 uppercase tracking-widest mb-4">Signal Purchases by Type</div>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <span className="text-sm font-bold text-gray-900">Velocity Signal</span>
                </div>
                <span className="text-sm font-black text-blue-600">{signalAnalytics.velocityPurchases}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${velocityPercentage}%` }}
                ></div>
              </div>
              <div className="text-[10px] text-gray-500 font-bold mt-1">{velocityPercentage.toFixed(1)}% of total</div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌐</span>
                  <span className="text-sm font-bold text-gray-900">Network Signal</span>
                </div>
                <span className="text-sm font-black text-purple-600">{signalAnalytics.networkPurchases}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${networkPercentage}%` }}
                ></div>
              </div>
              <div className="text-[10px] text-gray-500 font-bold mt-1">{networkPercentage.toFixed(1)}% of total</div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Total Purchases</span>
              <span className="text-xl font-black text-gray-900">{signalAnalytics.totalPurchases}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Total Cost</span>
              <span className="text-xl font-black text-emerald-600">${signalAnalytics.totalCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Avg Cost/Signal</span>
              <span className="text-xl font-black text-blue-600">${signalAnalytics.avgCostPerSignal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Purchases by Agent */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">Purchases by Agent</div>
          
          {Object.keys(signalAnalytics.purchasesByAgent).length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-gray-500 text-sm font-medium">No signal purchases yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(signalAnalytics.purchasesByAgent)
                .sort(([, a], [, b]) => b - a)
                .map(([agent, count]) => {
                  const percentage =
                    signalAnalytics.totalPurchases > 0
                      ? (count / signalAnalytics.totalPurchases) * 100
                      : 0;
                  return (
                    <div key={agent}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-gray-900">{agent}</span>
                        <span className="text-sm font-black text-blue-600">{count}</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Cost Efficiency Insight */}
          <div className="mt-6 pt-4 border-t border-blue-200">
            <div className="bg-white/50 rounded-xl p-4">
              <div className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">💡 Cost Efficiency</div>
              <p className="text-[10px] text-gray-700 leading-relaxed">
                Agents autonomously purchase signals only when risk justifies cost. 
                Average signal cost: <span className="font-black">${signalAnalytics.avgCostPerSignal.toFixed(2)}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
