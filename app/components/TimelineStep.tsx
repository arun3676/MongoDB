'use client';

import { useState } from 'react';
import { Settings, Search, FileCheck, Shield, Sword, Scale, DollarSign, Zap, X } from 'lucide-react';

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
  hasNegotiation?: boolean;
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
  hasNegotiation = false,
}: TimelineStepProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const getAgentIcon = () => {
    const agentLower = agentName?.toLowerCase() ?? '';
    const actionLower = action?.toLowerCase() ?? '';

    if (agentLower.includes('orchestrator')) {
      return <Settings className="w-6 h-6" />;
    } else if (agentLower.includes('suspicion') || agentLower.includes('l1')) {
      return '🔍';
    } else if (agentLower.includes('policy') || agentLower.includes('l2')) {
      return '🛡️';
    } else if (agentLower.includes('defense')) {
      return '🛡️';
    } else if (agentLower.includes('prosecution')) {
      return '⚔️';
    } else if (agentLower.includes('arbiter')) {
      return '⚖️';
    } else if (actionLower.includes('payment') || actionLower.includes('x402') || actionLower.includes('signal')) {
      return <DollarSign className="w-6 h-6" />;
    } else if (actionLower.includes('voi') || actionLower.includes('budget')) {
      return '💰';
    } else {
      return <Zap className="w-6 h-6" />;
    }
  };

  const renderIcon = () => {
    const icon = getAgentIcon();
    if (typeof icon === 'string') {
      return <span className="text-2xl">{icon}</span>;
    }
    return icon;
  };

  const getFriendlyAgentName = (name: string): string => {
    const nameMap: Record<string, string> = {
      'Suspicion Agent': 'Suspicion',
      'Policy Agent': 'Policy',
      'Defense Agent': 'Defense',
      'Prosecution Agent': 'Prosecution',
      'Arbiter Agent': 'Arbiter',
      'L1 Analyst': 'L1 Analyst',
      'L2 Analyst': 'L2 Analyst',
      'Orchestrator': 'Orchestrator',
      'VOI/Budget Agent': 'VOI/Budget',
    };
    if (nameMap[name]) return nameMap[name];
    return name.replace(' Agent', '').trim();
  };

  const getConfidence = (): number | null => {
    if (!output) return null;
    if (typeof output?.confidence === 'number') return output.confidence;
    if (typeof output?.confidence_score === 'number') return output.confidence_score;
    if (typeof output?.suspicion_score === 'number') return output.suspicion_score;
    return null;
  };

  const getConfidenceBadgeClass = (confidence: number): string => {
    if (confidence >= 80) return 'bg-green-100 text-green-700';
    if (confidence >= 50) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const getSummary = (): string => {
    if (!output) return 'Processing...';
    if (typeof output?.reasoning === 'string') {
      const reasoning = output.reasoning;
      return reasoning.length > 60 ? reasoning.substring(0, 57) + '...' : reasoning;
    }
    if (typeof output?.summary === 'string') {
      const summary = output.summary;
      return summary.length > 60 ? summary.substring(0, 57) + '...' : summary;
    }
    if (typeof output?.decision === 'string') return output.decision;
    return action?.replace(/_/g, ' ')?.toLowerCase() ?? 'Processing...';
  };

  const getModelInfo = (): string | null => {
    if (metadata?.llmModel) return metadata.llmModel as string;
    if (metadata?.model) return metadata.model as string;
    if (output && typeof output === 'object' && 'model' in output) return output.model as string;
    return null;
  };

  const formatModelName = (model: string): string => {
    if (model.includes('/')) {
      const parts = model.split('/');
      model = parts[parts.length - 1];
    }
    if (model.includes('llama-v3p3')) return 'Llama 3.3 70B';
    if (model.includes('llama-v3p1')) return 'Llama 3.1 70B';
    if (model.includes('llama-4')) return 'Llama 4 Maverick';
    return model.replace('llama-', 'Llama ').replace('v3p3', '3.3').replace('v3p1', '3.1').replace('-instruct', '').replace('-', ' ').toUpperCase();
  };

  const confidence = getConfidence();
  const friendlyName = getFriendlyAgentName(agentName);
  const summary = getSummary();
  const modelInfo = getModelInfo();

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="flex-shrink-0 bg-neutral-50 rounded-2xl p-5 cursor-pointer transition-all duration-300 border border-neutral-200 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 group"
        style={{ width: '240px' }}
      >
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-blue-600 bg-white shadow-sm border border-neutral-100 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
            {renderIcon()}
          </div>
        </div>
        <div className="text-center mb-3">
          <p className="text-sm font-bold text-gray-900 truncate">{friendlyName}</p>
        </div>
        {hasNegotiation && (
          <div className="flex justify-center mb-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 uppercase">
              💰 Haggled
            </span>
          </div>
        )}
        {confidence !== null && (
          <div className="flex justify-center mb-3">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getConfidenceBadgeClass(confidence)}`}>
              {confidence}%
            </span>
          </div>
        )}
        <div className="text-center">
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed font-medium">{summary}</p>
        </div>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl bg-white border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/80 backdrop-blur border-b border-gray-100 p-8 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600 bg-blue-50 border border-blue-100">
                  {renderIcon()}
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{agentName}</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Operation Sequence {stepNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Step ID</p>
                  <p className="text-sm font-bold text-gray-900">{stepNumber}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</p>
                  <p className="text-sm font-bold text-gray-900">{formatTimestamp(timestamp)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Latency</p>
                  <p className="text-sm font-bold text-gray-900">{formatDuration(duration)}</p>
                </div>
                {modelInfo && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Engine</p>
                    <p className="text-sm font-bold text-gray-900">{formatModelName(modelInfo)}</p>
                  </div>
                )}
              </div>

              {confidence !== null && (
                <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Confidence Score</p>
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getConfidenceBadgeClass(confidence)}`}>
                      {confidence}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${confidence >= 80 ? 'bg-green-500' : confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${confidence}%` }}
                    />
                  </div>
                </div>
              )}

              {output && typeof output?.reasoning === 'string' && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Agent Reasoning</p>
                  <div className="p-6 bg-blue-50/30 rounded-[1.5rem] border border-blue-100/50">
                    <p className="text-sm text-gray-700 leading-relaxed font-medium whitespace-pre-wrap">{output.reasoning}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Raw Payload</p>
                <div className="bg-neutral-900 rounded-[1.5rem] p-6 overflow-x-auto">
                  <pre className="text-xs text-blue-300/80 font-mono leading-relaxed">{JSON.stringify({ input, output, metadata }, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
