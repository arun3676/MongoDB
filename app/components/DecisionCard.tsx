'use client';

import { useState } from 'react';

interface Decision {
  decisionId: string;
  transactionId: string;
  agentName: string;
  decision: 'APPROVE' | 'DENY' | 'ESCALATE';
  confidence: number;
  reasoning: string;
  riskFactors: string[];
  signalsUsed: string[];
  signalCost: number;
  model?: string;
  processingTime?: number;
  timestamp: Date | string;
  isFinal: boolean;
}

interface DecisionCardProps {
  decision: Decision;
}

export default function DecisionCard({ decision }: DecisionCardProps) {
  const [showPrompt, setShowPrompt] = useState(false);

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

  const formatDuration = (ms: number | undefined) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getDecisionConfig = () => {
    switch (decision.decision) {
      case 'APPROVE':
        return {
          icon: '✓',
          label: 'Approve',
          bgColor: 'rgba(16, 185, 129, 0.15)',
          textColor: '#10B981',
          borderColor: 'rgba(16, 185, 129, 0.3)',
        };
      case 'DENY':
        return {
          icon: '✗',
          label: 'Deny',
          bgColor: 'rgba(239, 68, 68, 0.15)',
          textColor: '#EF4444',
          borderColor: 'rgba(239, 68, 68, 0.3)',
        };
      case 'ESCALATE':
        return {
          icon: '↗',
          label: 'Escalate',
          bgColor: 'rgba(245, 158, 11, 0.15)',
          textColor: '#F59E0B',
          borderColor: 'rgba(245, 158, 11, 0.3)',
        };
    }
  };

  const config = getDecisionConfig();
  const confidencePercent = (decision.confidence * 100).toFixed(0);
  
  // Get friendly agent name (remove redundant "Agent" suffix)
  const agentName = decision.agentName?.replace(' Agent', '').replace('_', ' ') || 'Unknown';

  return (
    <div 
      className="rounded-lg shadow-md border p-4"
      style={{ 
        backgroundColor: '#1A1A1A', 
        borderColor: config.borderColor
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold font-mono" style={{ color: '#E5E5E5' }}>{agentName}</h3>
        <span 
          className="px-2.5 py-1 rounded-full text-xs font-bold font-mono border"
          style={{
            backgroundColor: config.bgColor,
            color: config.textColor,
            borderColor: config.borderColor
          }}
        >
          {config.icon} {config.label}
        </span>
      </div>

      {/* Confidence Score */}
      <div className="mb-3 pb-3 border-b" style={{ borderColor: '#262626' }}>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-mono uppercase" style={{ color: '#9CA3AF' }}>Confidence</p>
          <span className="text-sm font-bold font-mono" style={{ color: '#E5E5E5' }}>{confidencePercent}%</span>
        </div>
        <div className="w-full rounded-full h-1.5" style={{ backgroundColor: '#262626' }}>
          <div
            className="h-1.5 rounded-full"
            style={{ 
              width: `${confidencePercent}%`,
              backgroundColor: decision.confidence >= 0.8 ? '#10B981' : decision.confidence >= 0.5 ? '#F59E0B' : '#EF4444'
            }}
          />
        </div>
      </div>

      {/* Reasoning */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Reasoning</p>
        <p className="text-sm text-gray-700 leading-relaxed">{decision.reasoning}</p>
      </div>

      {/* Risk Factors */}
      {decision.riskFactors && decision.riskFactors.length > 0 && (
        <div className="mb-3 pb-3 border-b" style={{ borderColor: '#262626' }}>
          <ul className="space-y-1">
            {decision.riskFactors.slice(0, 2).map((factor, index) => (
              <li key={index} className="text-xs font-mono flex items-start gap-1.5" style={{ color: '#E5E5E5' }}>
                <span className="text-red-400 flex-shrink-0">•</span>
                <span className="flex-1">{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Signals Used */}
      {decision.signalsUsed && decision.signalsUsed.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1.5">
            {decision.signalsUsed.map((signalId, index) => (
              <span
                key={index}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono border"
                style={{
                  backgroundColor: 'rgba(62, 180, 137, 0.1)',
                  color: '#3EB489',
                  borderColor: 'rgba(62, 180, 137, 0.3)'
                }}
              >
                {signalId?.substring ? signalId.substring(0, 6) + '...' : String(signalId).substring(0, 6)}
              </span>
            ))}
          </div>
          {decision.signalCost > 0 && (
            <p className="text-[10px] font-mono mt-1.5" style={{ color: '#9CA3AF' }}>${decision.signalCost.toFixed(2)}</p>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="pt-3 border-t flex items-center justify-between text-[10px] font-mono" style={{ borderColor: '#262626' }}>
        <span style={{ color: '#9CA3AF' }}>{formatTimestamp(decision.timestamp)}</span>
        {decision.processingTime && (
          <span style={{ color: '#9CA3AF' }}>{formatDuration(decision.processingTime)}</span>
        )}
      </div>
    </div>
  );
}
