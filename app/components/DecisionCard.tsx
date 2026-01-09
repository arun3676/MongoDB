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
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
        };
      case 'DENY':
        return {
          icon: '✗',
          label: 'Deny',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200',
        };
      case 'ESCALATE':
        return {
          icon: '↗️',
          label: 'Escalate',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200',
        };
    }
  };

  const config = getDecisionConfig();
  const confidencePercent = (decision.confidence * 100).toFixed(0);

  return (
    <div className={`bg-white rounded-lg shadow-md border ${config.borderColor} p-5`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{decision.agentName || 'Unknown Agent'}</h3>
          {decision.decisionId && (
            <p className="text-xs text-gray-500">ID: {decision.decisionId.substring(0, 12)}...</p>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${config.bgColor} ${config.textColor}`}>
          <span aria-hidden="true">{config.icon}</span> {config.label}
        </span>
      </div>

      {/* Confidence Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Confidence</p>
          <span className="text-sm font-bold text-gray-900">{confidencePercent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full ${
              decision.confidence >= 0.8
                ? 'bg-green-500'
                : decision.confidence >= 0.5
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${confidencePercent}%` }}
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
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Risk Factors</p>
          <ul className="space-y-1">
            {decision.riskFactors.map((factor, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-red-500 flex-shrink-0">⚠</span>
                <span className="flex-1">{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Signals Used */}
      {decision.signalsUsed && decision.signalsUsed.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Signals Used</p>
          <div className="flex flex-wrap gap-2">
            {decision.signalsUsed.map((signalId, index) => (
              <a
                key={index}
                href={`#signal-${signalId}`}
                className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
              >
                {signalId?.substring ? signalId.substring(0, 8) + '...' : String(signalId)}
              </a>
            ))}
          </div>
          {decision.signalCost > 0 && (
            <p className="text-xs text-gray-500 mt-2">Signal cost: ${decision.signalCost.toFixed(2)}</p>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="pt-4 border-t border-gray-200 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-gray-500 mb-1">Timestamp</p>
          <p className="text-gray-900 font-medium">{formatTimestamp(decision.timestamp)}</p>
        </div>
        {decision.processingTime && (
          <div>
            <p className="text-gray-500 mb-1">Processing Time</p>
            <p className="text-gray-900 font-medium">{formatDuration(decision.processingTime)}</p>
          </div>
        )}
        {decision.model && (
          <div className="col-span-2">
            <p className="text-gray-500 mb-1">Model</p>
            <p className="text-gray-900 font-medium font-mono">{decision.model}</p>
          </div>
        )}
      </div>

      {/* View LLM Prompt Button */}
      <button
        onClick={() => setShowPrompt(!showPrompt)}
        className="w-full mt-4 text-blue-600 hover:underline text-sm font-medium focus:outline-none transition-colors py-2"
        aria-expanded={showPrompt}
      >
        {showPrompt ? 'Hide LLM Details' : 'View LLM Prompt'}
      </button>

      {/* LLM Prompt Details */}
      {showPrompt && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            LLM Prompt & Response
          </p>
          <div className="bg-gray-50 rounded-md p-3 overflow-x-auto max-h-64 overflow-y-auto">
            <pre className="text-xs text-gray-700">
              {JSON.stringify(
                {
                  model: decision.model,
                  processingTime: formatDuration(decision.processingTime),
                  confidence: decision.confidence,
                  reasoning: decision.reasoning,
                  riskFactors: decision.riskFactors,
                  decision: decision.decision,
                },
                null,
                2
              )}
            </pre>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Full prompt and response details available in{' '}
            <a href="#audit" className="text-blue-600 hover:underline">
              audit packet
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}
