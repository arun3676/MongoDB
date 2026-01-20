'use client';

interface TrendDataPoint {
  date: string;
  cases: number;
  fraudPrevented: number;
  totalCost: number;
  avgLatency: number;
  approveRate: number;
  denyRate: number;
}

interface Props {
  trendData: TrendDataPoint[];
}

export default function TrendCharts({ trendData }: Props) {
  if (trendData.length === 0) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-gray-100 p-12 text-center">
        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No Trend Data</p>
        <p className="text-gray-500 text-sm mt-2">Trend charts will appear as cases are processed over time.</p>
      </div>
    );
  }

  const maxCases = Math.max(...trendData.map((d) => d.cases), 1);
  const maxCost = Math.max(...trendData.map((d) => d.totalCost), 1);
  const maxLatency = Math.max(...trendData.map((d) => d.avgLatency), 1);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-xl shadow-gray-200/20">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Trend Analysis (Last 7 Days)</h2>
        <p className="text-gray-500 text-sm font-medium">Case volume, costs, and performance trends over time</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cases Over Time */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
          <div className="text-xs font-black text-gray-600 uppercase tracking-widest mb-4">Case Volume</div>
          <div className="space-y-2">
            {trendData.map((point, idx) => {
              const height = maxCases > 0 ? (point.cases / maxCases) * 100 : 0;
              return (
                <div key={point.date} className="flex items-end gap-2">
                  <div className="text-[10px] font-bold text-gray-600 w-16 shrink-0">
                    {formatDate(point.date)}
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-8 overflow-hidden relative">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${height}%` }}
                    >
                      {point.cases > 0 && (
                        <span className="text-[10px] font-black text-white">{point.cases}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cost Over Time */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 border border-emerald-200">
          <div className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-4">Total Cost</div>
          <div className="space-y-2">
            {trendData.map((point) => {
              const height = maxCost > 0 ? (point.totalCost / maxCost) * 100 : 0;
              return (
                <div key={point.date} className="flex items-end gap-2">
                  <div className="text-[10px] font-bold text-gray-600 w-16 shrink-0">
                    {formatDate(point.date)}
                  </div>
                  <div className="flex-1 bg-emerald-200 rounded-full h-8 overflow-hidden relative">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${height}%` }}
                    >
                      {point.totalCost > 0 && (
                        <span className="text-[10px] font-black text-white">${point.totalCost.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Approval/Denial Rates */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">Decision Rates</div>
          <div className="space-y-2">
            {trendData.map((point) => (
              <div key={point.date} className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-bold text-gray-600 w-16 shrink-0">
                    {formatDate(point.date)}
                  </div>
                  <div className="flex-1 flex gap-1">
                    <div
                      className="bg-emerald-500 rounded-l-full h-6 flex items-center justify-center transition-all duration-500"
                      style={{ width: `${point.approveRate}%` }}
                    >
                      {point.approveRate > 10 && (
                        <span className="text-[9px] font-black text-white px-1">
                          {point.approveRate.toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <div
                      className="bg-orange-500 rounded-r-full h-6 flex items-center justify-center transition-all duration-500"
                      style={{ width: `${point.denyRate}%` }}
                    >
                      {point.denyRate > 10 && (
                        <span className="text-[9px] font-black text-white px-1">
                          {point.denyRate.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Average Latency */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
          <div className="text-xs font-black text-purple-600 uppercase tracking-widest mb-4">Avg Latency</div>
          <div className="space-y-2">
            {trendData.map((point) => {
              const height = maxLatency > 0 ? (point.avgLatency / maxLatency) * 100 : 0;
              return (
                <div key={point.date} className="flex items-end gap-2">
                  <div className="text-[10px] font-bold text-gray-600 w-16 shrink-0">
                    {formatDate(point.date)}
                  </div>
                  <div className="flex-1 bg-purple-200 rounded-full h-8 overflow-hidden relative">
                    <div
                      className="bg-purple-600 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${height}%` }}
                    >
                      {point.avgLatency > 0 && (
                        <span className="text-[10px] font-black text-white">
                          {point.avgLatency < 1000 ? `${point.avgLatency}ms` : `${(point.avgLatency / 1000).toFixed(1)}s`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
