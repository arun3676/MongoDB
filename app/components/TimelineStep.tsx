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

  // Get agent icon based on agent name or action (with emoji fallback)
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
    } else {
      return <Zap className="w-6 h-6" />;
    }
  };

  // Render icon (handle both emoji strings and components)
  const renderIcon = () => {
    const icon = getAgentIcon();
    if (typeof icon === 'string') {
      return <span className="text-2xl">{icon}</span>;
    }
    return icon;
  };

  // Get friendly agent name
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
    };

    // Check for exact match
    if (nameMap[name]) {
      return nameMap[name];
    }

    // Return shortened version
    return name.replace(' Agent', '').trim();
  };

  // Get confidence from output
  const getConfidence = (): number | null => {
    if (!output) return null;

    // Check various possible locations for confidence (with optional chaining)
    if (typeof output?.confidence === 'number') {
      return output.confidence;
    }
    if (typeof output?.confidence_score === 'number') {
      return output.confidence_score;
    }
    if (typeof output?.suspicion_score === 'number') {
      return output.suspicion_score;
    }

    return null;
  };

  // Get confidence badge color
  const getConfidenceBadgeClass = (confidence: number): string => {
    if (confidence >= 80) {
      return 'badge-success';
    } else if (confidence >= 50) {
      return 'badge-warning';
    } else {
      return 'badge-danger';
    }
  };

  // Get summary from output
  const getSummary = (): string => {
    if (!output) return 'Processing...';

    // Try to extract reasoning (with optional chaining)
    if (typeof output?.reasoning === 'string') {
      // Truncate to ~60 characters
      const reasoning = output.reasoning;
      if (reasoning.length > 60) {
        return reasoning.substring(0, 57) + '...';
      }
      return reasoning;
    }

    // Try other fields
    if (typeof output?.summary === 'string') {
      const summary = output.summary;
      if (summary.length > 60) {
        return summary.substring(0, 57) + '...';
      }
      return summary;
    }

    if (typeof output?.decision === 'string') {
      return output.decision;
    }

    // Fallback to action
    return action?.replace(/_/g, ' ')?.toLowerCase() ?? 'Processing...';
  };

  // Extract model information from metadata or output
  const getModelInfo = (): string | null => {
    if (metadata?.llmModel) {
      return metadata.llmModel as string;
    }
    if (metadata?.model) {
      return metadata.model as string;
    }
    if (output && typeof output === 'object' && 'model' in output) {
      return output.model as string;
    }
    return null;
  };

  // Format model name for display
  const formatModelName = (model: string): string => {
    // Handle full path like "accounts/fireworks/models/llama-v3p3-70b-instruct"
    if (model.includes('/')) {
      const parts = model.split('/');
      model = parts[parts.length - 1];
    }

    // Handle common patterns
    if (model.includes('llama-v3p3')) {
      return 'Llama 3.3 70B';
    }
    if (model.includes('llama-v3p1')) {
      return 'Llama 3.1 70B';
    }
    if (model.includes('llama-4')) {
      return 'Llama 4 Maverick';
    }

    // Default: clean up the name
    return model
      .replace('llama-', 'Llama ')
      .replace('v3p3', '3.3')
      .replace('v3p1', '3.1')
      .replace('-instruct', '')
      .replace('-', ' ')
      .toUpperCase();
  };

  const confidence = getConfidence();
  const friendlyName = getFriendlyAgentName(agentName);
  const summary = getSummary();
  const modelInfo = getModelInfo();

  return (
    <>
      {/* Tile - 220px width as specified */}
      <div
        onClick={() => setIsModalOpen(true)}
        className="flex-shrink-0 glass-card p-4 cursor-pointer transition-all duration-200 hover:border-[var(--mint)] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02] animate-fade-in"
        style={{
          width: '220px',
          animationDuration: '200ms',
          background: 'linear-gradient(135deg, rgba(23, 25, 35, 0.95), rgba(30, 33, 45, 0.9))',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Icon */}
        <div className="flex justify-center mb-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-[var(--mint)] transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)',
            }}
          >
            {renderIcon()}
          </div>
        </div>

        {/* Agent Name */}
        <div className="text-center mb-3">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {friendlyName}
          </p>
        </div>

        {/* Haggled Badge (for negotiation) */}
        {hasNegotiation && (
          <div className="flex justify-center mb-2">
            <span
              className="badge text-xs font-medium px-2 py-1"
              style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.15))',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                color: '#fbbf24',
              }}
            >
              💰 Haggled
            </span>
          </div>
        )}

        {/* Confidence Badge */}
        {confidence !== null && (
          <div className="flex justify-center mb-3">
            <span className={`badge ${getConfidenceBadgeClass(confidence)} text-xs font-medium`}>
              {confidence}%
            </span>
          </div>
        )}

        {/* Summary - max 60 chars */}
        <div className="text-center">
          <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
            {summary}
          </p>
        </div>
      </div>

      {/* Dark Glassmorphic Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
          }}
          onClick={() => setIsModalOpen(false)}
        >
          {/* Modal Content - Slide-over style */}
          <div
            className="max-w-3xl w-full max-h-[90vh] overflow-y-auto m-4 rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'fade-in 200ms ease-out',
              background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(23, 25, 35, 0.95))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              boxShadow: '0 0 40px rgba(16, 185, 129, 0.15), 0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Header */}
            <div
              className="sticky top-0 border-b p-6 flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(23, 25, 35, 0.95))',
                backdropFilter: 'blur(20px)',
                borderColor: 'rgba(16, 185, 129, 0.2)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--mint)]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))',
                    boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)',
                  }}
                >
                  {renderIcon()}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                    {agentName}
                  </h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    Step {stepNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--mint)] hover:bg-[var(--carbon-lighter)] transition-all duration-200"
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                }}
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    Step ID
                  </p>
                  <p className="text-sm text-[var(--text-primary)] mono">
                    {stepNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    Timestamp
                  </p>
                  <p className="text-sm text-[var(--text-primary)] mono">
                    {formatTimestamp(timestamp)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    Duration
                  </p>
                  <p className="text-sm text-[var(--text-primary)] mono">
                    {formatDuration(duration)}
                  </p>
                </div>
                {modelInfo && (
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                      Model
                    </p>
                    <p className="text-sm text-[var(--text-primary)]">
                      {formatModelName(modelInfo)}
                    </p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    Action
                  </p>
                  <p className="text-sm text-[var(--text-primary)] mono">
                    {action}
                  </p>
                </div>
              </div>

              {/* Confidence (if available) */}
              {confidence !== null && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Confidence Score
                  </p>
                  <div className="flex items-center gap-3">
                    <span className={`badge ${getConfidenceBadgeClass(confidence)}`}>
                      {confidence}%
                    </span>
                    <div className="flex-1 h-2 bg-[var(--carbon)] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          confidence >= 80
                            ? 'bg-[var(--success)]'
                            : confidence >= 50
                            ? 'bg-[var(--warning)]'
                            : 'bg-[var(--danger)]'
                        }`}
                        style={{ width: `${confidence}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Raw Reasoning */}
              {output && typeof output?.reasoning === 'string' && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Agent Reasoning
                  </p>
                  <div className="code-block">
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {output.reasoning}
                    </p>
                  </div>
                </div>
              )}

              {/* Raw Output */}
              {output && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Raw Output
                  </p>
                  <div className="code-block mono text-[var(--text-secondary)] overflow-x-auto">
                    <pre className="text-xs leading-relaxed">{JSON.stringify(output, null, 2)}</pre>
                  </div>
                </div>
              )}

              {/* Input Context (if available) */}
              {input && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Input Context
                  </p>
                  <div className="code-block mono text-[var(--text-secondary)] overflow-x-auto">
                    <pre className="text-xs leading-relaxed">{JSON.stringify(input, null, 2)}</pre>
                  </div>
                </div>
              )}

              {/* Metadata (if available and different from output) */}
              {metadata && Object.keys(metadata ?? {}).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Metadata
                  </p>
                  <div className="code-block mono text-[var(--text-secondary)] overflow-x-auto">
                    <pre className="text-xs leading-relaxed">{JSON.stringify(metadata, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
