'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

interface Signal {
  signalType: 'velocity' | 'network';
  cost: number;
  purchasedBy: string;
}

interface CostTrackerProps {
  totalCost: number;
  signals: Signal[];
  spentSoFar?: number;
}

export default function CostTracker({ totalCost, signals, spentSoFar }: CostTrackerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const prevSpentSoFarRef = useRef<number>(spentSoFar || 0);

  // Detect when spentSoFar increments and trigger pulse animation
  useEffect(() => {
    if (spentSoFar !== undefined && spentSoFar > prevSpentSoFarRef.current) {
      setIsPulsing(true);
      // Reset pulse after animation completes (2s for animate-pulse)
      const timer = setTimeout(() => {
        setIsPulsing(false);
      }, 2000);
      prevSpentSoFarRef.current = spentSoFar;
      return () => clearTimeout(timer);
    } else if (spentSoFar !== undefined) {
      prevSpentSoFarRef.current = spentSoFar;
    }
  }, [spentSoFar]);

  // Memoize signal lookups for performance
  const velocitySignal = useMemo(() => signals.find((s) => s.signalType === 'velocity'), [signals]);
  const networkSignal = useMemo(() => signals.find((s) => s.signalType === 'network'), [signals]);

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(2)}`;
  };

  // Use spentSoFar if available (live from budget), otherwise fall back to totalCost
  const displayCost = spentSoFar !== undefined ? spentSoFar : totalCost;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 border border-blue-100">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm text-gray-600 uppercase tracking-wider mb-1">Total Analysis Cost</h2>
          <p
            className={`text-3xl font-bold text-blue-900 transition-all duration-200 ${
              isPulsing ? 'animate-pulse' : ''
            }`}
            style={{
              transform: isPulsing ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {formatCost(displayCost)}
          </p>
          {spentSoFar !== undefined && (
            <p className="text-xs text-gray-500 mt-1">
              Live budget tracking
            </p>
          )}
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

      {/* Infrastructure Footer */}
      <div className="mt-4 pt-4 border-t border-blue-200">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <span>Powered by</span>
          <a
            href="https://www.mongodb.com/products/platform/atlas-database"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#00ED64] hover:text-[#00684A] transition-colors inline-flex items-center gap-1"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.193 9.555c-1.264-5.58-4.252-7.414-4.573-8.115-.28-.394-.53-.954-.735-1.44-.036.495-.055.685-.523 1.184-.723.566-4.438 3.682-4.74 10.02-.282 5.912 4.27 9.435 4.888 9.884l.07.05A73.49 73.49 0 0111.91 24h.481c.114-1.032.284-2.056.51-3.07.417-.296 4.812-3.502 4.292-11.375z"/>
            </svg>
            MongoDB Atlas
          </a>
          <span>&</span>
          <a
            href="https://www.coinbase.com/cloud/products/cdp"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#0052FF] hover:text-[#0040C1] transition-colors inline-flex items-center gap-1"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12zm-1.5-13.5h3v3h-3v-3z"/>
            </svg>
            Coinbase CDP
          </a>
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-1">
          Autonomous payments via x402 protocol
        </p>
      </div>
    </div>
  );
}
