/**
 * SPLIT-VIEW CONSENSUS SUMMARY
 *
 * Clean side-by-side debate visualization with Carbon Mint theme:
 * - Left: Fraud Prosecution (Red tint with sword icon)
 * - Center: Arbiter scales divider
 * - Right: User Defense (Emerald tint with shield icon)
 * - Bottom: Arbiter Final Summary with verdict
 *
 * RESILIENT: Uses extensive optional chaining to handle partial/missing data
 */

'use client';

interface DebateCardProps {
  defense?: {
    confidence?: number;
    reasoning?: string;
    keyPoints?: string[];
    mitigatingFactors?: string[];
    output?: {
      confidence?: number;
      reasoning?: string;
      keyPoints?: string[];
    };
  };
  prosecution?: {
    confidence?: number;
    reasoning?: string;
    keyPoints?: string[];
    aggravatingFactors?: string[];
    output?: {
      confidence?: number;
      reasoning?: string;
      keyPoints?: string[];
    };
  };
  verdict?: {
    decision?: 'APPROVE' | 'DENY' | string;
    confidence?: number;
    reasoning?: string;
    defenseStrength?: number;
    prosecutionStrength?: number;
    decidingFactors?: string[];
    output?: {
      decision?: string;
      confidence?: number;
      reasoning?: string;
      defenseStrength?: number;
      prosecutionStrength?: number;
    };
  };
}

export function DebateCard({ defense, prosecution, verdict }: DebateCardProps) {
  // Only show if debate actually happened
  if (!defense && !prosecution && !verdict) {
    return null;
  }

  // Handle nested output structure with optional chaining
  const prosecutionReasoning = prosecution?.reasoning ?? prosecution?.output?.reasoning ?? null;
  const defenseReasoning = defense?.reasoning ?? defense?.output?.reasoning ?? null;

  const verdictDecision = verdict?.decision ?? verdict?.output?.decision ?? 'PENDING';
  const verdictConfidence = verdict?.confidence ?? verdict?.output?.confidence ?? null;
  const verdictReasoning = verdict?.reasoning ?? verdict?.output?.reasoning ?? null;
  const defenseStrength = verdict?.defenseStrength ?? verdict?.output?.defenseStrength ?? null;
  const prosecutionStrength = verdict?.prosecutionStrength ?? verdict?.output?.prosecutionStrength ?? null;

  const normalizedDecision = verdictDecision?.toUpperCase() ?? 'PENDING';
  const isApproved = normalizedDecision === 'APPROVE' || normalizedDecision === 'ALLOW';
  const isDenied = normalizedDecision === 'DENY' || normalizedDecision === 'BLOCK';

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="glass-panel p-4 border-b border-slate-700/50">
        <h3 className="text-white text-lg font-bold flex items-center justify-center gap-2">
          <span className="text-2xl">⚖️</span> Consensus Summary
        </h3>
      </div>

      {/* Split-View Grid: Prosecution vs Defense */}
      <div className="relative grid grid-cols-1 md:grid-cols-2">
        {/* Left Side - Prosecution (Red Tint) */}
        <div className="p-6 bg-gradient-to-br from-red-500/10 via-red-900/5 to-transparent border-r border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">⚔️</span>
            <div className="flex-1">
              <div className="font-bold text-red-400 text-lg uppercase tracking-wide">
                Fraud Prosecution
              </div>
              {prosecutionStrength !== null && (
                <div className="text-xs text-red-300 mt-1">
                  Strength: {Math.round(prosecutionStrength * 100)}%
                </div>
              )}
            </div>
          </div>

          {prosecutionReasoning ? (
            <div className="p-4 bg-black/30 rounded-lg border border-red-500/30">
              <p className="text-sm text-gray-300 leading-relaxed">
                {prosecutionReasoning}
              </p>
            </div>
          ) : (
            <div className="p-4 bg-black/20 rounded-lg border border-slate-600/30">
              <p className="text-sm text-gray-500 italic">
                No prosecution argument available
              </p>
            </div>
          )}
        </div>

        {/* Right Side - Defense (Emerald Tint) */}
        <div className="p-6 bg-gradient-to-bl from-emerald-500/10 via-emerald-900/5 to-transparent">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🛡️</span>
            <div className="flex-1">
              <div className="font-bold text-emerald-400 text-lg uppercase tracking-wide">
                User Defense
              </div>
              {defenseStrength !== null && (
                <div className="text-xs text-emerald-300 mt-1">
                  Strength: {Math.round(defenseStrength * 100)}%
                </div>
              )}
            </div>
          </div>

          {defenseReasoning ? (
            <div className="p-4 bg-black/30 rounded-lg border border-emerald-500/30">
              <p className="text-sm text-gray-300 leading-relaxed">
                {defenseReasoning}
              </p>
            </div>
          ) : (
            <div className="p-4 bg-black/20 rounded-lg border border-slate-600/30">
              <p className="text-sm text-gray-500 italic">
                No defense argument available
              </p>
            </div>
          )}
        </div>

        {/* Center Divider with Arbiter Icon - Desktop Only */}
        <div className="hidden md:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="glass-card p-3 rounded-full border-2 border-mint-400/50 shadow-lg shadow-mint-500/20">
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl">⚖️</span>
              <span className="text-xs text-mint-400 font-semibold uppercase tracking-wider">
                Arbiter
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Arbiter Final Summary - Bottom Section */}
      {verdictReasoning && (
        <div className={`p-6 border-t-4 ${
          isApproved
            ? 'bg-gradient-to-r from-mint-900/20 via-indigo-900/20 to-mint-900/20 border-mint-500'
            : isDenied
            ? 'bg-gradient-to-r from-red-900/20 via-indigo-900/20 to-red-900/20 border-red-500'
            : 'bg-gradient-to-r from-slate-900/20 via-indigo-900/20 to-slate-900/20 border-slate-500'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚖️</span>
              <div>
                <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">
                  Tribunal Verdict
                </div>
                <div className={`text-xl font-bold mt-1 ${
                  isApproved ? 'text-mint-400' : isDenied ? 'text-red-400' : 'text-slate-400'
                }`}>
                  {isApproved ? 'APPROVE' : isDenied ? 'DENY' : 'PENDING'}
                </div>
              </div>
            </div>

            {verdictConfidence !== null && (
              <div className={`px-4 py-2 rounded-lg border-2 ${
                isApproved
                  ? 'bg-mint-500/20 text-mint-300 border-mint-500/50'
                  : isDenied
                  ? 'bg-red-500/20 text-red-300 border-red-500/50'
                  : 'bg-slate-500/20 text-slate-300 border-slate-500/50'
              }`}>
                <div className="text-xs uppercase tracking-wide text-gray-400">Confidence</div>
                <div className="text-2xl font-bold">
                  {Math.round(verdictConfidence * 100)}%
                </div>
              </div>
            )}
          </div>

          <div className="p-5 bg-black/40 rounded-lg border border-indigo-500/30">
            <p className="text-sm text-gray-300 leading-relaxed">
              {verdictReasoning}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default DebateCard;
