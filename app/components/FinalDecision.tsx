interface FinalDecisionProps {
  decision: 'APPROVE' | 'DENY';
  confidence: number;
  reasoning: string;
  agentDecisionsCount: number;
  signalsCount: number;
  totalCost: number;
  riskFactorsCount: number;
  transactionId: string;
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
}: FinalDecisionProps) {
  const isApproved = decision === 'APPROVE';
  const confidencePercent = ((confidence || 0) * 100).toFixed(1);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className={`rounded-lg shadow-lg p-6 border-2 ${
        isApproved ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
      }`}
    >
      {/* Hero Decision Display */}
      <div className="text-center mb-6">
        <div className="mb-3">
          <span
            className={`inline-block text-6xl ${isApproved ? 'text-green-600' : 'text-red-600'}`}
            aria-hidden="true"
          >
            {isApproved ? '✓' : '✗'}
          </span>
        </div>
        <h2
          className={`text-3xl font-bold mb-2 ${isApproved ? 'text-green-900' : 'text-red-900'}`}
          role="status"
          aria-live="polite"
        >
          Transaction {isApproved ? 'APPROVED' : 'DENIED'}
        </h2>
        <p className="text-sm text-gray-600">Final Reviewer Decision</p>
      </div>

      {/* Confidence Gauge */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Confidence Level</p>
          <span className="text-2xl font-bold text-gray-900">{confidencePercent}%</span>
        </div>
        <div className="w-full bg-gray-300 rounded-full h-4 shadow-inner">
          <div
            className={`h-4 rounded-full ${
              isApproved
                ? 'bg-gradient-to-r from-green-400 to-green-600'
                : 'bg-gradient-to-r from-red-400 to-red-600'
            }`}
            style={{ width: `${confidencePercent}%` }}
          />
        </div>
      </div>

      {/* Final Reasoning */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Final Reasoning</p>
        <div className="bg-white rounded-md p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-800 leading-relaxed">{reasoning}</p>
        </div>
      </div>

      {/* Evidence Summary */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Evidence Summary</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-md p-3 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Agent Decisions</p>
            <p className="text-2xl font-bold text-gray-900">{agentDecisionsCount}</p>
            <p className="text-xs text-gray-600 mt-1">Aligned decisions</p>
          </div>

          <div className="bg-white rounded-md p-3 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Signals Purchased</p>
            <p className="text-2xl font-bold text-gray-900">{signalsCount}</p>
            <p className="text-xs text-gray-600 mt-1">${(totalCost || 0).toFixed(2)} total cost</p>
          </div>

          <div className="bg-white rounded-md p-3 shadow-sm border border-gray-200 col-span-2">
            <p className="text-xs text-gray-500 mb-1">Risk Factors Identified</p>
            <p className="text-2xl font-bold text-gray-900">{riskFactorsCount}</p>
            <p className="text-xs text-gray-600 mt-1">
              {riskFactorsCount === 0
                ? 'No significant risks detected'
                : riskFactorsCount > 5
                  ? 'High risk transaction'
                  : 'Moderate risk detected'}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href={`/api/audit/${transactionId}`}
          download={`fraud-audit-${transactionId}-${new Date().toISOString()}.json`}
          className="bg-blue-600 text-white text-center py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Download Audit Packet
        </a>

        <button
          onClick={scrollToTop}
          className="bg-gray-100 text-gray-700 py-3 px-4 rounded-md font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
        >
          View Complete Timeline
        </button>
      </div>

      {/* Footer Note */}
      <div className="mt-6 pt-4 border-t border-gray-300">
        <p className="text-xs text-gray-600 text-center">
          This decision was made by an autonomous multi-agent system with complete auditability.
          <br />
          All data stored in MongoDB Atlas with immutable audit trail.
        </p>
      </div>
    </div>
  );
}
