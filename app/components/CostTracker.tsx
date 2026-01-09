'use client';

import { useState } from 'react';

interface Signal {
  signalType: 'velocity' | 'network';
  cost: number;
  purchasedBy: string;
}

interface CostTrackerProps {
  totalCost: number;
  signals: Signal[];
}

export default function CostTracker({ totalCost, signals }: CostTrackerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const velocitySignal = signals.find((s) => s.signalType === 'velocity');
  const networkSignal = signals.find((s) => s.signalType === 'network');

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(2)}`;
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 border border-blue-100">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm text-gray-600 uppercase tracking-wider mb-1">Total Analysis Cost</h2>
          <p className="text-3xl font-bold text-blue-900">{formatCost(totalCost)}</p>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium focus:outline-none focus:underline transition-colors"
          aria-expanded={isExpanded}
          aria-label="Toggle cost breakdown"
        >
          {isExpanded ? 'Hide Breakdown' : 'Show Breakdown'}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-blue-200 space-y-2">
          <p className="text-xs text-gray-600 uppercase tracking-wider mb-3">Cost Breakdown</p>

          {velocitySignal ? (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-700">
                Velocity Signal <span className="text-xs text-gray-500">({velocitySignal.purchasedBy})</span>
              </span>
              <span className="font-semibold text-gray-900">{formatCost(velocitySignal.cost)}</span>
            </div>
          ) : (
            <div className="flex justify-between items-center text-sm text-gray-400">
              <span>Velocity Signal</span>
              <span>Not purchased</span>
            </div>
          )}

          {networkSignal ? (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-700">
                Network Signal <span className="text-xs text-gray-500">({networkSignal.purchasedBy})</span>
              </span>
              <span className="font-semibold text-gray-900">{formatCost(networkSignal.cost)}</span>
            </div>
          ) : (
            <div className="flex justify-between items-center text-sm text-gray-400">
              <span>Network Signal</span>
              <span>Not purchased</span>
            </div>
          )}

          <div className="flex justify-between items-center text-sm border-t border-blue-200 pt-2">
            <span className="text-gray-700">LLM Calls</span>
            <span className="text-green-600 font-medium">Included</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-700">Final Review</span>
            <span className="text-green-600 font-medium">Free (cached)</span>
          </div>

          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-xs text-gray-500">
              Premium signals purchased via x402 protocol.{' '}
              <a href="#audit" className="text-blue-600 hover:underline">
                View payment audit
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
