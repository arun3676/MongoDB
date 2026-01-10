'use client';

import { useState } from 'react';

interface TimelineStepProps {
  stepNumber: number;
  agentName: string;
  action: string;
  timestamp: Date | string;
  duration: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  isLast?: boolean;
}

export default function TimelineStep({
  stepNumber,
  agentName,
  action,
  timestamp,
  duration,
  input,
  output,
  metadata,
  isLast = false,
}: TimelineStepProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTimestamp = (ts: Date | string) => {
    const d = typeof ts === 'string' ? new Date(ts) : ts;
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getActionConfig = () => {
    if (action === 'CASE_CREATED') {
      return { icon: '🆕', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    } else if (action.includes('SIGNAL_PURCHASED')) {
      return { icon: '💳', color: 'text-purple-600', bgColor: 'bg-purple-100' };
    } else if (action.includes('VOI_ANALYSIS')) {
      return { icon: '💰', color: 'text-green-600', bgColor: 'bg-green-100' };
    } else if (action.includes('ANALYSIS_COMPLETED')) {
      return { icon: '🔍', color: 'text-green-600', bgColor: 'bg-green-100' };
    } else if (action.includes('ESCALATE')) {
      return { icon: '↗️', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    } else if (action.includes('FINAL')) {
      return { icon: '✅', color: 'text-green-600', bgColor: 'bg-green-100' };
    } else {
      return { icon: '⚡', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  // Check if this is a VOI analysis step with rich data
  const isVOIAnalysis = action === 'VOI_ANALYSIS' && output && typeof output === 'object';
  const voiData = isVOIAnalysis ? (output as any) : null;

  const { icon, color, bgColor } = getActionConfig();

  return (
    <div className="relative">
      {/* Vertical line connector */}
      {!isLast && <div className="absolute left-5 top-12 w-0.5 h-full bg-gray-200" aria-hidden="true" />}

      <div className="flex gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${bgColor} flex items-center justify-center ${color}`}>
          <span className="text-lg" aria-hidden="true">
            {icon}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 pb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-500">STEP {stepNumber}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-sm font-medium text-gray-900">{agentName}</span>
                </div>
                <h3 className="text-base font-semibold text-gray-800 mb-2">{action.replace(/_/g, ' ')}</h3>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{formatTimestamp(timestamp)}</span>
                  <span>•</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>

              {/* Expand button */}
              {(input || output || metadata) && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium focus:outline-none focus:underline transition-colors flex-shrink-0"
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                >
                  {isExpanded ? 'Hide Details' : 'Show Details'}
                </button>
              )}
            </div>

            {/* VOI Analysis Rich Visualization */}
            {isVOIAnalysis && voiData && voiData.voiDecisions && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span>💰</span> Economic Decision Analysis (VOI)
                  </h4>

                  {/* Summary Stats */}
                  {voiData.summary && (
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="bg-white rounded-md p-2 text-center">
                        <div className="text-xs text-gray-500 mb-1">Evaluated</div>
                        <div className="text-lg font-bold text-gray-800">{voiData.summary.totalConsidered}</div>
                      </div>
                      <div className="bg-green-100 rounded-md p-2 text-center">
                        <div className="text-xs text-green-600 mb-1">Purchased</div>
                        <div className="text-lg font-bold text-green-700">{voiData.summary.purchased}</div>
                      </div>
                      <div className="bg-gray-100 rounded-md p-2 text-center">
                        <div className="text-xs text-gray-500 mb-1">Skipped</div>
                        <div className="text-lg font-bold text-gray-700">{voiData.summary.skipped}</div>
                      </div>
                      <div className="bg-red-100 rounded-md p-2 text-center">
                        <div className="text-xs text-red-600 mb-1">Refused</div>
                        <div className="text-lg font-bold text-red-700">{voiData.summary.economicRefusals}</div>
                      </div>
                    </div>
                  )}

                  {/* Decision Details */}
                  <div className="space-y-2">
                    {voiData.voiDecisions.map((decision: any, idx: number) => (
                      <div
                        key={idx}
                        className={`rounded-md p-3 ${
                          decision.decision === 'BUY'
                            ? 'bg-green-100 border-l-4 border-green-500'
                            : decision.decision === 'ECONOMIC_REFUSAL'
                            ? 'bg-red-100 border-l-4 border-red-500'
                            : 'bg-gray-100 border-l-4 border-gray-400'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-gray-800">{decision.toolConsidered}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                decision.decision === 'BUY'
                                  ? 'bg-green-200 text-green-800'
                                  : decision.decision === 'ECONOMIC_REFUSAL'
                                  ? 'bg-red-200 text-red-800'
                                  : 'bg-gray-200 text-gray-700'
                              }`}>
                                {decision.decision}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${decision.voi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${decision.voi.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">VOI Score</div>
                          </div>
                        </div>

                        {/* Economic Metrics */}
                        <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                          <div>
                            <span className="text-gray-500">Cost:</span>
                            <span className="font-semibold text-gray-700 ml-1">${decision.toolCost.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Expected Loss:</span>
                            <span className="font-semibold text-gray-700 ml-1">${decision.expectedLoss.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Confidence Gain:</span>
                            <span className="font-semibold text-gray-700 ml-1">{(decision.confidenceGain * 100).toFixed(0)}%</span>
                          </div>
                        </div>

                        {/* Reasoning */}
                        <div className="text-xs text-gray-600 italic">
                          {decision.reasoning}
                        </div>

                        {/* Economic Rationality Badge */}
                        {decision.isEconomicallyRational !== undefined && (
                          <div className="mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              decision.isEconomicallyRational
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {decision.isEconomicallyRational ? '✓ Economically Rational' : '⚠ Cost > Risk'}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Expanded content */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                {input && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Input</p>
                    <div className="bg-gray-50 rounded-md p-3 overflow-x-auto">
                      <pre className="text-xs text-gray-700">{JSON.stringify(input, null, 2)}</pre>
                    </div>
                  </div>
                )}

                {output && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Output</p>
                    <div className="bg-gray-50 rounded-md p-3 overflow-x-auto">
                      <pre className="text-xs text-gray-700">{JSON.stringify(output, null, 2)}</pre>
                    </div>
                  </div>
                )}

                {metadata && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Metadata</p>
                    <div className="bg-gray-50 rounded-md p-3 overflow-x-auto">
                      <pre className="text-xs text-gray-700">{JSON.stringify(metadata, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
