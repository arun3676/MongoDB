'use client';

import { useState, ReactNode } from 'react';

interface SignalData {
  riskScore?: number;
  velocityScore?: number;
  networkRiskScore?: number;
  flags?: string[];
  riskFlags?: string[];
  interpretation?: string;
  [key: string]: unknown;
}

interface Signal {
  signalId: string;
  signalType: 'velocity' | 'network';
  transactionId: string;
  userId: string;
  data: SignalData;
  cost: number;
  purchasedAt: Date | string;
  purchasedBy: string;
  expiresAt: Date | string;
}

interface SignalCardProps {
  signal: Signal;
}

export default function SignalCard({ signal }: SignalCardProps) {
  const [showFullData, setShowFullData] = useState(false);

  const formatTimestamp = (ts: Date | string) => {
    const d = typeof ts === 'string' ? new Date(ts) : ts;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatCost = (cost: number) => `$${cost.toFixed(2)}`;

  const isVelocity = signal.signalType === 'velocity';
  const config = isVelocity
    ? {
        name: 'Velocity Signal',
        icon: '⚡',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        badgeColor: 'bg-blue-100 text-blue-800',
      }
    : {
        name: 'Network Signal',
        icon: '🌐',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        badgeColor: 'bg-purple-100 text-purple-800',
      };

  // Extract key metrics from signal data
  const getRiskScore = (): number | null => {
    // Check for explicit riskScore first
    if (signal.data.riskScore !== undefined) {
      return signal.data.riskScore;
    }
    // Fall back to velocityScore or networkRiskScore
    if (signal.data.velocityScore !== undefined) {
      return signal.data.velocityScore;
    }
    if (signal.data.networkRiskScore !== undefined) {
      return signal.data.networkRiskScore;
    }
    return null;
  };

  const getRiskLevel = (score: number | null): string => {
    if (score === null) return 'Unknown';
    if (score >= 0.7) return 'High';
    if (score >= 0.4) return 'Medium';
    return 'Low';
  };

  const getRiskLevelColor = (level: string): string => {
    if (level === 'High') return 'text-red-600 bg-red-100';
    if (level === 'Medium') return 'text-yellow-600 bg-yellow-100';
    if (level === 'Low') return 'text-green-600 bg-green-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getTopFlags = (): string[] => {
    if (signal.data.flags && signal.data.flags.length > 0) {
      return signal.data.flags.slice(0, 3);
    }
    if (signal.data.riskFlags && signal.data.riskFlags.length > 0) {
      return signal.data.riskFlags.slice(0, 3);
    }
    return [];
  };

  const riskScore: number | null = getRiskScore();
  const riskLevel: string = getRiskLevel(riskScore);
  const topFlags: string[] = getTopFlags();

  return (
    <div className={`rounded-lg shadow-md border ${config.borderColor} ${config.bgColor} p-5`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`text-2xl ${config.color}`} aria-hidden="true">
            {config.icon}
          </span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{config.name}</h3>
            <p className="text-xs text-gray-500">ID: {signal.signalId.substring(0, 12)}...</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${config.badgeColor}`}>
          {formatCost(signal.cost)}
        </span>
      </div>

      {/* Summary Info */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs text-gray-600 mb-1">Purchased By</p>
          <p className="text-sm font-medium text-gray-900">{signal.purchasedBy}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Purchased At</p>
          <p className="text-sm font-medium text-gray-900">{formatTimestamp(signal.purchasedAt)}</p>
        </div>
      </div>

      {riskScore !== null ? (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-600">Risk Score</p>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getRiskLevelColor(riskLevel)}`}>
              {riskLevel}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                riskLevel === 'High' ? 'bg-red-500' : riskLevel === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${(riskScore * 100).toFixed(0)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{(riskScore * 100).toFixed(1)}%</p>
        </div>
      ) : null}

      {/* Top Risk Flags */}
      {topFlags.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-600 mb-2">Top Risk Flags</p>
          <ul className="space-y-1">
            {topFlags.map((flag, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-red-500 flex-shrink-0">•</span>
                <span className="flex-1">{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Interpretation Summary */}
      {signal.data.interpretation && (
        <div className="mb-4">
          <p className="text-xs text-gray-600 mb-1">Interpretation</p>
          <p className="text-sm text-gray-700">{String(signal.data.interpretation)}</p>
        </div>
      )}

      {/* View Full Data Button */}
      <button
        onClick={() => setShowFullData(!showFullData)}
        className={`w-full ${config.color} hover:underline text-sm font-medium focus:outline-none transition-colors py-2`}
        aria-expanded={showFullData}
      >
        {showFullData ? 'Hide Full Data' : 'View Full Data'}
      </button>

      {/* Full Data Modal/Expansion */}
      {showFullData && (
        <div className="mt-4 pt-4 border-t border-gray-300">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Complete Signal Payload</p>
          <div className="bg-white rounded-md p-3 overflow-x-auto max-h-96 overflow-y-auto">
            <pre className="text-xs text-gray-700">{JSON.stringify(signal.data, null, 2)}</pre>
          </div>

          <div className="mt-3 text-xs text-gray-500">
            <p>
              <strong>Expires:</strong> {formatTimestamp(signal.expiresAt)}
            </p>
            <p className="mt-1">
              <a href="#audit" className={`${config.color} hover:underline`}>
                View x402 payment flow audit
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
