'use client';

import { useState, ReactNode } from 'react';
import PaymentProofCard from './PaymentProofCard';

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
  paymentProof?: string;
}

interface SignalCardProps {
  signal: Signal;
}

export default function SignalCard({ signal }: SignalCardProps) {
  const [showFullData, setShowFullData] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

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
        color: 'text-mint-500',
        bgColor: 'bg-mint-500/10',
        borderColor: 'border-mint-500/30',
        badgeColor: 'bg-mint-500/20 text-mint-500',
      }
    : {
        name: 'Network Signal',
        icon: '🌐',
        color: 'text-mint-500',
        bgColor: 'bg-mint-500/10',
        borderColor: 'border-mint-500/30',
        badgeColor: 'bg-mint-500/20 text-mint-500',
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
    <div 
      className="rounded-lg shadow-md border p-4 relative"
      style={{
        backgroundColor: '#1A1A1A',
        borderColor: '#3EB48930'
      }}
    >
      {/* MongoDB Receipt Icon */}
      <button
        onClick={() => setShowReceipt(!showReceipt)}
        className="absolute top-3 right-3 p-1.5 rounded transition-all duration-200 group z-10"
        style={{ backgroundColor: 'rgba(62, 180, 137, 0.1)' }}
        title="View MongoDB Receipt"
        aria-label="View MongoDB Receipt"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3.5 w-3.5 transition-colors"
          style={{ color: '#9CA3AF' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </button>

      {/* Receipt Modal */}
      {showReceipt && (
        <div 
          className="absolute top-12 right-3 z-20 rounded-lg shadow-2xl p-3 min-w-[280px]"
          style={{ 
            backgroundColor: '#121212', 
            borderColor: '#3EB489',
            borderWidth: '1px',
            borderStyle: 'solid'
          }}
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#262626' }}>
            <h4 className="text-xs font-semibold font-mono" style={{ color: '#3EB489' }}>Receipt</h4>
            <button
              onClick={() => setShowReceipt(false)}
              className="text-base leading-none transition-colors hover:opacity-70"
              style={{ color: '#9CA3AF' }}
              aria-label="Close receipt"
            >
              ×
            </button>
          </div>
          <div className="space-y-2 text-[10px] font-mono">
            <div>
              <span className="block mb-0.5" style={{ color: '#9CA3AF' }}>ID:</span>
              <p className="break-all text-xs" style={{ color: '#E5E5E5' }}>{signal.signalId}</p>
            </div>
            <div>
              <span className="block mb-0.5" style={{ color: '#9CA3AF' }}>Time:</span>
              <p className="text-xs" style={{ color: '#E5E5E5' }}>{formatTimestamp(signal.purchasedAt)}</p>
            </div>
            <div>
              <span className="block mb-0.5" style={{ color: '#9CA3AF' }}>Cost:</span>
              <p className="text-xs" style={{ color: '#3EB489' }}>{formatCost(signal.cost)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3 pr-8">
        <div className="flex items-center gap-2">
          <span className="text-lg" style={{ color: '#3EB489' }}>{config.icon}</span>
          <div>
            <h3 className="text-sm font-bold font-mono" style={{ color: '#E5E5E5' }}>{config.name}</h3>
            <p className="text-[10px] font-mono" style={{ color: '#9CA3AF' }}>{signal.signalId.substring(0, 12)}...</p>
          </div>
        </div>
        <span 
          className="px-2 py-1 rounded text-[10px] font-bold font-mono shrink-0"
          style={{ 
            backgroundColor: 'rgba(62, 180, 137, 0.15)', 
            color: '#3EB489'
          }}
        >
          {formatCost(signal.cost)}
        </span>
      </div>

      {/* Summary Info */}
      <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b text-xs" style={{ borderColor: '#262626' }}>
        <div>
          <p className="text-[9px] mb-1 font-mono uppercase" style={{ color: '#9CA3AF' }}>By</p>
          <p className="font-mono" style={{ color: '#E5E5E5' }}>{signal.purchasedBy}</p>
        </div>
        <div>
          <p className="text-[9px] mb-1 font-mono uppercase" style={{ color: '#9CA3AF' }}>At</p>
          <p className="font-mono" style={{ color: '#E5E5E5' }}>{formatTimestamp(signal.purchasedAt)}</p>
        </div>
      </div>

      {riskScore !== null ? (
        <div className="mb-3 pb-3 border-b" style={{ borderColor: '#262626' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-mono uppercase" style={{ color: '#9CA3AF' }}>Risk</p>
            <span 
              className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono"
              style={{
                backgroundColor: riskLevel === 'High' ? 'rgba(239, 68, 68, 0.15)' : riskLevel === 'Medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: riskLevel === 'High' ? '#EF4444' : riskLevel === 'Medium' ? '#F59E0B' : '#10B981'
              }}
            >
              {riskLevel}
            </span>
          </div>
          <div className="w-full rounded-full h-1.5 mb-1" style={{ backgroundColor: '#262626' }}>
            <div
              className="h-1.5 rounded-full"
              style={{ 
                width: `${(riskScore * 100).toFixed(0)}%`,
                backgroundColor: riskLevel === 'High' ? '#EF4444' : riskLevel === 'Medium' ? '#F59E0B' : '#10B981'
              }}
            />
          </div>
          <p className="text-[10px] font-mono" style={{ color: '#9CA3AF' }}>{(riskScore * 100).toFixed(1)}%</p>
        </div>
      ) : null}

      {/* Top Risk Flags */}
      {topFlags.length > 0 && (
        <div className="mb-3 pb-3 border-b" style={{ borderColor: '#262626' }}>
          <p className="text-[9px] mb-1.5 font-mono uppercase" style={{ color: '#9CA3AF' }}>Flags</p>
          <ul className="space-y-1">
            {topFlags.map((flag, index) => (
              <li key={index} className="flex items-start gap-1.5">
                <span className="text-red-400 flex-shrink-0 text-xs">•</span>
                <span className="flex-1 text-xs font-mono" style={{ color: '#E5E5E5' }}>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Interpretation Summary */}
      {signal.data.interpretation && (
        <div className="mb-3">
          <p className="text-[9px] mb-1 font-mono uppercase" style={{ color: '#9CA3AF' }}>Interpretation</p>
          <p className="text-xs font-mono leading-relaxed" style={{ color: '#E5E5E5' }}>{String(signal.data.interpretation)}</p>
        </div>
      )}

      {/* View Full Data Button */}
      <button
        onClick={() => setShowFullData(!showFullData)}
        className="w-full text-xs font-semibold font-mono focus:outline-none transition-all py-2 rounded border"
        style={{ 
          color: '#3EB489',
          borderColor: 'rgba(62, 180, 137, 0.3)',
          backgroundColor: showFullData ? 'rgba(62, 180, 137, 0.1)' : 'transparent'
        }}
        aria-expanded={showFullData}
      >
        {showFullData ? 'Hide' : 'View Data'}
      </button>

      {/* Full Data Modal/Expansion */}
      {showFullData && (
        <div className="mt-3 pt-3 border-t space-y-3" style={{ borderColor: '#262626' }}>
          <div>
            <p className="text-[9px] font-semibold uppercase mb-2 font-mono" style={{ color: '#9CA3AF' }}>Payload</p>
            <div className="rounded p-3 overflow-x-auto max-h-64 overflow-y-auto border" style={{ backgroundColor: '#121212', borderColor: '#262626' }}>
              <pre className="text-[10px] font-mono" style={{ color: '#E5E5E5' }}>{JSON.stringify(signal.data, null, 2)}</pre>
            </div>
          </div>
          <div className="text-[10px] font-mono" style={{ color: '#9CA3AF' }}>
            <p>Expires: {formatTimestamp(signal.expiresAt)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
