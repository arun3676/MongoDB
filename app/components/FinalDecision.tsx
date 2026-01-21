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
      className={`relative w-full py-10 px-8 rounded-[2.5rem] bg-white border border-gray-100 shadow-2xl transition-all duration-500 overflow-hidden ${isApproved ? 'shadow-emerald-500/5' :
        isDenied ? 'shadow-red-500/5' :
          'shadow-gray-200/10'
        }`}
    >
      {/* Background Decorative Element */}
      <div className={`absolute top-0 right-0 w-64 h-64 blur-[100px] opacity-10 rounded-full -mr-20 -mt-20 ${isApproved ? 'bg-emerald-500' : isDenied ? 'bg-red-500' : 'bg-blue-500'
        }`}></div>

      {/* Tech Status */}
      <div className="absolute top-6 right-8 flex items-center gap-2 z-10">
        <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${isApproved ? 'bg-emerald-500' : isDenied ? 'bg-red-500' : 'bg-blue-500'}`}></span>
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
          Nexus Protocol {modelName}
        </span>
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* SLEEK BADGE */}
        <div className="mb-8 inline-block relative group">
          <div className={`absolute -inset-1 bg-gradient-to-r rounded-[1.5rem] blur-xl opacity-20 transition-all duration-1000 group-hover:opacity-40 ${isApproved ? 'from-emerald-400 to-teal-500' :
              isDenied ? 'from-red-500 to-rose-700' :
                'from-blue-400 to-indigo-500'
            }`}></div>
          <div
            className={`relative px-12 py-6 rounded-[1.5rem] border shadow-lg transform transition-all duration-500 hover:scale-[1.02] ${isApproved ? 'bg-white text-emerald-600 border-emerald-100' :
              isDenied ? 'bg-white text-red-600 border-red-100' :
                'bg-white text-gray-900 border-gray-100'
              }`}
          >
            <span className={`text-[9px] font-black uppercase tracking-[0.5em] block mb-2 opacity-60 ${isApproved ? 'text-emerald-500' : isDenied ? 'text-red-500' : 'text-gray-400'}`}>System Verdict</span>
            <div className="text-4xl md:text-5xl font-black tracking-tight leading-none">
              {isApproved ? 'APPROVED' : isDenied ? 'BLOCKED' : 'PENDING'}
            </div>
          </div>
        </div>

        {/* Confidence Stats */}
        <div className="flex flex-col items-center gap-1 mb-8">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Confidence Index</span>
            <span className={`text-4xl font-black tracking-tighter ${isApproved ? 'text-emerald-500' : isDenied ? 'text-red-500' : 'text-gray-900'}`}>{confidencePercent}%</span>
          </div>
        </div>

        {/* Reasoning Section */}
        <div className="bg-neutral-50/50 rounded-[1.5rem] p-8 border border-neutral-100/50 mb-10 max-w-3xl mx-auto">
          <p className="text-gray-600 font-medium leading-relaxed italic">
            "{finalReasoning}"
          </p>
        </div>

        {/* Evidence Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Agent Quorum Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-100 transition-all hover:shadow-lg hover:shadow-blue-200/30">
            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2">Agent Quorum</p>
            <p className="text-3xl font-black text-blue-700">{agentDecisionsCount || 0} Votes</p>
          </div>
          
          {/* Network Signals Card */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-5 rounded-2xl border border-purple-100 transition-all hover:shadow-lg hover:shadow-purple-200/30">
            <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest mb-2">Network Signals</p>
            <p className="text-3xl font-black text-purple-700">{signalsCount || 0} Datapoints</p>
          </div>
          
          {/* Anomalies Detected Card */}
          <div className={`p-5 rounded-2xl border transition-all hover:shadow-lg ${riskFactorsCount === 0 
            ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-100 hover:shadow-emerald-200/30' 
            : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200 hover:shadow-red-200/40'
          }`}>
            <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${riskFactorsCount === 0 ? 'text-emerald-600' : 'text-red-600'}`}>Anomalies Detected</p>
            <p className={`text-3xl font-black ${riskFactorsCount === 0 ? 'text-emerald-600' : 'text-red-600'}`}>{riskFactorsCount || 0} Flags</p>
          </div>
        </div>
      </div>
    </div>
  );
}
