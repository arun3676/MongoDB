'use client';

interface FinalDecisionProps {
  decision?: 'APPROVE' | 'DENY' | 'ALLOW' | 'BLOCK' | string;
  confidence?: number;
  reasoning?: string;
  agentDecisionsCount?: number;
  signalsCount?: number;
  totalCost?: number;
  riskFactorsCount?: number;
  riskFactors?: string[];
  transactionId: string;
  arbiterVerdict?: {
    output?: {
      reasoning?: string;
      decision?: string;
      confidence?: number;
    };
    metadata?: {
      model?: string;
    };
  };
  metadata?: {
    llmModel?: string;
  };
}

// Format model names to be user-friendly
function formatModelName(model?: string): string {
  if (!model) return 'Llama 3.3 70B';

  const modelLower = model.toLowerCase();

  if (modelLower.includes('llama-v3p3-70b') || modelLower.includes('llama-3.3-70b')) {
    return 'Llama 3.3 70B';
  }
  if (modelLower.includes('llama-v3p1-405b') || modelLower.includes('llama-3.1-405b')) {
    return 'Llama 3.1 405B';
  }
  if (modelLower.includes('llama-v3p1-70b') || modelLower.includes('llama-3.1-70b')) {
    return 'Llama 3.1 70B';
  }
  if (modelLower.includes('gpt-4')) {
    return 'GPT-4';
  }
  if (modelLower.includes('claude')) {
    return 'Claude';
  }

  // Fallback: Return original or default
  return model || 'Llama 3.3 70B';
}

export default function FinalDecision({
  decision,
  confidence,
  reasoning,
  agentDecisionsCount,
  signalsCount,
  totalCost,
  riskFactorsCount,
  riskFactors,
  transactionId,
  arbiterVerdict,
  metadata,
}: FinalDecisionProps) {
  // Extract arbiter reasoning if available (priority over general reasoning)
  const arbiterReasoning = arbiterVerdict?.output?.reasoning;
  const arbiterDecision = arbiterVerdict?.output?.decision;
  const arbiterConfidence = arbiterVerdict?.output?.confidence;

  // Use arbiter data if available, otherwise fall back to finalDecision data
  const finalReasoning = arbiterReasoning || reasoning || 'Analysis in progress...';
  const finalDecision = arbiterDecision || decision || 'PENDING';
  const finalConfidence = arbiterConfidence ?? confidence ?? 0;

  // Extract model information
  const modelName = formatModelName(
    arbiterVerdict?.metadata?.model || metadata?.llmModel
  );

  // Normalize decision to handle variations
  const normalizedDecision = (finalDecision?.toUpperCase() ?? 'PENDING') as string;
  const isApproved = normalizedDecision === 'APPROVE' || normalizedDecision === 'ALLOW';
  const isDenied = normalizedDecision === 'DENY' || normalizedDecision === 'BLOCK';
  const isPending = !isApproved && !isDenied;

  const confidenceValue = finalConfidence;
  const confidencePercent = Math.round(confidenceValue * 100);

  return (
    <div
      className={`relative w-full py-10 px-8 rounded-2xl animate-fade-in ${
        isApproved
          ? 'bg-gradient-to-br from-emerald-950/40 to-emerald-900/30 border-2 border-emerald-500/50'
          : isDenied
          ? 'bg-gradient-to-br from-orange-950/40 to-orange-900/30 border-2 border-orange-500/50'
          : 'bg-gradient-to-br from-gray-900/40 to-gray-800/30 border-2 border-gray-600/50'
      }`}
      style={{
        boxShadow: isApproved
          ? '0 0 60px rgba(0, 255, 194, 0.25)'
          : isDenied
          ? '0 0 60px rgba(255, 165, 2, 0.25)'
          : '0 0 40px rgba(100, 100, 100, 0.2)',
      }}
    >
      {/* Model Tech Badge - Top Right */}
      <div className="absolute top-4 right-4">
        <div className="badge-neutral text-xs">
          Analysis by {modelName} via Fireworks AI
        </div>
      </div>

      {/* MASSIVE Verdict Header */}
      <div className="text-center mb-8 mt-4">
        <div
          className={`inline-block px-16 py-8 rounded-3xl mb-8 transform transition-all duration-300 ${
            isApproved
              ? 'bg-gradient-to-br from-emerald-400 via-mint to-emerald-500 text-emerald-950'
              : isDenied
              ? 'bg-gradient-to-br from-orange-400 via-amber-400 to-orange-500 text-orange-950'
              : 'bg-gradient-to-br from-gray-500 via-gray-400 to-gray-500 text-gray-950'
          }`}
          style={{
            boxShadow: isApproved
              ? '0 0 80px rgba(0, 255, 194, 0.4), inset 0 0 40px rgba(255, 255, 255, 0.2)'
              : isDenied
              ? '0 0 80px rgba(255, 165, 2, 0.4), inset 0 0 40px rgba(255, 255, 255, 0.2)'
              : '0 0 40px rgba(100, 100, 100, 0.3)',
          }}
        >
          <div
            className="text-7xl md:text-8xl font-black tracking-widest"
            role="status"
            aria-live="polite"
          >
            {isApproved ? 'APPROVED' : isDenied ? 'BLOCKED' : 'PENDING'}
          </div>
        </div>

        {confidenceValue > 0 && (
          <div className="flex items-center justify-center gap-4">
            <span className="text-base font-semibold uppercase tracking-wide text-gray-300">
              Confidence:
            </span>
            <span
              className={`text-5xl font-black ${
                isApproved ? 'text-emerald-400' : isDenied ? 'text-orange-400' : 'text-gray-400'
              }`}
            >
              {confidencePercent}%
            </span>
          </div>
        )}
      </div>

      {/* Arbiter Reasoning - Primary Explanation */}
      {finalReasoning && finalReasoning !== 'Analysis in progress...' && (
        <div className="mb-8">
          <div className="text-label mb-4 text-center">FINAL VERDICT REASONING</div>
          <div
            className={`glass-panel p-6 rounded-xl border-2 ${
              isApproved
                ? 'border-emerald-500/30'
                : isDenied
                ? 'border-orange-500/30'
                : 'border-gray-600/30'
            }`}
          >
            <p className="text-base text-gray-200 leading-relaxed text-center">
              {finalReasoning}
            </p>
          </div>
        </div>
      )}

      {/* Evidence Summary Stats */}
      {(agentDecisionsCount !== undefined || signalsCount !== undefined || riskFactorsCount !== undefined) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {agentDecisionsCount !== undefined && (
            <div className="glass-panel p-5 rounded-xl text-center border border-gray-700/50">
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide font-semibold">
                Agent Decisions
              </p>
              <p className="text-4xl font-black mint-text">{agentDecisionsCount}</p>
            </div>
          )}

          {signalsCount !== undefined && (
            <div className="glass-panel p-5 rounded-xl text-center border border-gray-700/50">
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide font-semibold">
                Signals Analyzed
              </p>
              <p className="text-4xl font-black mint-text">{signalsCount}</p>
              {totalCost !== undefined && (
                <p className="text-xs text-gray-500 mt-2 font-mono">
                  ${totalCost.toFixed(2)} total cost
                </p>
              )}
            </div>
          )}

          {riskFactorsCount !== undefined && (
            <div className="glass-panel p-5 rounded-xl text-center border border-gray-700/50">
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide font-semibold">
                Risk Indicators
              </p>
              <p
                className={`text-4xl font-black ${
                  riskFactorsCount === 0
                    ? 'text-emerald-400'
                    : riskFactorsCount > 5
                    ? 'text-red-400'
                    : 'text-orange-400'
                }`}
              >
                {riskFactorsCount}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
