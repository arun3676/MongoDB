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

function formatModelName(model?: string): string {
  if (!model) return 'Llama 3.3 70B';
  const modelLower = model.toLowerCase();
  if (modelLower.includes('llama-v3p3-70b') || modelLower.includes('llama-3.3-70b')) return 'Llama 3.3 70B';
  if (modelLower.includes('llama-v3p1-405b') || modelLower.includes('llama-3.1-405b')) return 'Llama 3.1 405B';
  if (modelLower.includes('llama-4')) return 'Llama 4 Maverick';
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
  transactionId,
  arbiterVerdict,
  metadata,
}: FinalDecisionProps) {
  const arbiterReasoning = arbiterVerdict?.output?.reasoning;
  const arbiterDecision = arbiterVerdict?.output?.decision;
  const arbiterConfidence = arbiterVerdict?.output?.confidence;

  const finalReasoning = arbiterReasoning || reasoning || 'System analysis in progress...';
  const finalDecision = arbiterDecision || decision || 'PENDING';
  const finalConfidence = arbiterConfidence ?? confidence ?? 0;
  const modelName = formatModelName(arbiterVerdict?.metadata?.model || metadata?.llmModel);

  const normalizedDecision = (finalDecision?.toUpperCase() ?? 'PENDING') as string;
  const isApproved = normalizedDecision === 'APPROVE' || normalizedDecision === 'ALLOW';
  const isDenied = normalizedDecision === 'DENY' || normalizedDecision === 'BLOCK';

  const confidencePercent = Math.round(finalConfidence * 100);

  return (
    <div
      className={`relative w-full py-12 px-8 rounded-[2.5rem] bg-white border-2 shadow-2xl transition-all duration-500 ${isApproved ? 'border-emerald-500/20 shadow-emerald-500/10' :
          isDenied ? 'border-red-500/20 shadow-red-500/10' :
            'border-gray-200 shadow-gray-200/10'
        }`}
    >
      {/* Tech Status */}
      <div className="absolute top-6 right-8 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          Secured by {modelName}
        </span>
      </div>

      <div className="max-w-4xl mx-auto text-center">
        {/* MASSIVE BADGE */}
        <div className="mb-10 inline-block relative group">
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-[3rem] opacity-20 blur-2xl transition-all duration-1000 group-hover:opacity-30"></div>
          <div
            className={`relative px-20 py-10 rounded-[2.5rem] border shadow-sm transform transition-transform duration-500 hover:scale-105 ${isApproved ? 'bg-emerald-500 text-white border-emerald-400' :
                isDenied ? 'bg-red-600 text-white border-red-500' :
                  'bg-white text-gray-900 border-gray-100'
              }`}
          >
            <span className="text-sm font-black uppercase tracking-[0.4em] block mb-2 opacity-80">Verdict</span>
            <div className="text-6xl md:text-8xl font-black tracking-tighter">
              {isApproved ? 'APPROVED' : isDenied ? 'BLOCKED' : 'PENDING'}
            </div>
          </div>
        </div>

        {/* Confidence Stats */}
        <div className="flex flex-col items-center gap-1 mb-10">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Confidence Index</span>
            <span className={`text-4xl font-black ${isApproved ? 'text-emerald-500' : isDenied ? 'text-red-500' : 'text-gray-900'}`}>{confidencePercent}%</span>
          </div>
        </div>

        {/* Reasoning Section */}
        <div className="bg-neutral-50/50 rounded-[2rem] p-8 border border-neutral-100 mb-10">
          <p className="text-lg text-gray-700 font-medium italic leading-relaxed max-w-2xl mx-auto">
            "{finalReasoning}"
          </p>
        </div>

        {/* Global Evidence Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Agents Participated</p>
            <p className="text-3xl font-black text-gray-900">{agentDecisionsCount || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">🛡️</div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Internal Signals</p>
            <p className="text-3xl font-black text-gray-900">{signalsCount || 0}</p>
            {totalCost !== undefined && (
              <p className="text-[10px] font-bold text-blue-500 mt-2 uppercase tracking-tight">${totalCost.toFixed(2)} Protocol Fee</p>
            )}
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Risk Flags</p>
            <p className={`text-3xl font-black ${riskFactorsCount === 0 ? 'text-emerald-500' : 'text-red-500'}`}>{riskFactorsCount || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
