/**
 * DEBATE CARD - Visual Adversarial Reasoning Display
 *
 * Shows the "wow" moment: AI agents arguing opposite sides
 * - Defense (green): Argues for APPROVAL
 * - Prosecution (red): Argues for DENIAL
 * - Arbiter verdict (highlighted): Final decision with reasoning
 */

'use client';

interface DebateCardProps {
  defense: {
    confidence: number;
    reasoning: string;
    keyPoints?: string[];
    mitigatingFactors?: string[];
  };
  prosecution: {
    confidence: number;
    reasoning: string;
    keyPoints?: string[];
    aggravatingFactors?: string[];
  };
  verdict: {
    decision: 'APPROVE' | 'DENY';
    confidence: number;
    reasoning: string;
    defenseStrength: number;
    prosecutionStrength: number;
    decidingFactors?: string[];
  };
}

export function DebateCard({ defense, prosecution, verdict }: DebateCardProps) {
  const isApproved = verdict.decision === 'APPROVE';

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-purple-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-4">
        <h3 className="text-white text-lg font-bold flex items-center gap-2">
          <span className="text-2xl">&#9878;</span> Agent Debate Tribunal
        </h3>
        <p className="text-blue-100 text-sm mt-1">
          AI agents argue opposing positions before final verdict
        </p>
      </div>

      {/* Side-by-side arguments */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
        {/* Defense */}
        <div className="p-4 bg-green-50">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">&#128737;</span>
            <span className="font-bold text-green-700 text-lg">DEFENSE</span>
          </div>
          <div className="mb-2">
            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
              {(defense.confidence * 100).toFixed(0)}% confident for APPROVE
            </span>
          </div>
          <p className="text-sm text-gray-700 mb-3 italic">&quot;{defense.reasoning}&quot;</p>

          {defense.keyPoints && defense.keyPoints.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-green-700 mb-1">Key Points:</div>
              <div className="space-y-1">
                {defense.keyPoints.map((point, i) => (
                  <div key={i} className="text-xs text-green-600 flex items-start gap-1">
                    <span className="text-green-500">&#10003;</span> {point}
                  </div>
                ))}
              </div>
            </div>
          )}

          {defense.mitigatingFactors && defense.mitigatingFactors.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-green-700 mb-1">Mitigating Factors:</div>
              <div className="flex flex-wrap gap-1">
                {defense.mitigatingFactors.map((factor, i) => (
                  <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                    {factor}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Prosecution */}
        <div className="p-4 bg-red-50">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">&#9876;</span>
            <span className="font-bold text-red-700 text-lg">PROSECUTION</span>
          </div>
          <div className="mb-2">
            <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
              {(prosecution.confidence * 100).toFixed(0)}% confident for DENY
            </span>
          </div>
          <p className="text-sm text-gray-700 mb-3 italic">&quot;{prosecution.reasoning}&quot;</p>

          {prosecution.keyPoints && prosecution.keyPoints.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-red-700 mb-1">Key Points:</div>
              <div className="space-y-1">
                {prosecution.keyPoints.map((point, i) => (
                  <div key={i} className="text-xs text-red-600 flex items-start gap-1">
                    <span className="text-red-500">&#9888;</span> {point}
                  </div>
                ))}
              </div>
            </div>
          )}

          {prosecution.aggravatingFactors && prosecution.aggravatingFactors.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-red-700 mb-1">Aggravating Factors:</div>
              <div className="flex flex-wrap gap-1">
                {prosecution.aggravatingFactors.map((factor, i) => (
                  <span key={i} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                    {factor}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Arbiter Verdict */}
      <div className={`p-4 ${isApproved ? 'bg-green-100 border-t-4 border-green-500' : 'bg-red-100 border-t-4 border-red-500'}`}>
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="text-3xl">&#128104;&#8205;&#9878;&#65039;</span>
          <div className="text-center">
            <div className="text-sm text-gray-600 font-medium">ARBITER VERDICT</div>
            <div className={`text-2xl font-bold ${isApproved ? 'text-green-700' : 'text-red-700'}`}>
              {isApproved ? '&#10004; APPROVED' : '&#10060; DENIED'}
            </div>
          </div>
          <span className={`text-lg font-bold px-3 py-1 rounded ${isApproved ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
            {(verdict.confidence * 100).toFixed(0)}%
          </span>
        </div>

        <p className="text-center text-sm text-gray-700 mb-4 max-w-2xl mx-auto">
          &quot;{verdict.reasoning}&quot;
        </p>

        {/* Argument strength comparison */}
        <div className="flex justify-center gap-8 mb-3">
          <div className="text-center">
            <div className="text-xs text-green-600 font-medium mb-1">Defense Strength</div>
            <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${verdict.defenseStrength * 100}%` }}
              />
            </div>
            <div className="text-xs text-green-600 mt-1">{(verdict.defenseStrength * 100).toFixed(0)}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-red-600 font-medium mb-1">Prosecution Strength</div>
            <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-500"
                style={{ width: `${verdict.prosecutionStrength * 100}%` }}
              />
            </div>
            <div className="text-xs text-red-600 mt-1">{(verdict.prosecutionStrength * 100).toFixed(0)}%</div>
          </div>
        </div>

        {/* Deciding factors */}
        {verdict.decidingFactors && verdict.decidingFactors.length > 0 && (
          <div className="text-center">
            <div className="text-xs font-semibold text-gray-600 mb-1">Deciding Factors:</div>
            <div className="flex flex-wrap justify-center gap-1">
              {verdict.decidingFactors.map((factor, i) => (
                <span key={i} className={`text-xs px-2 py-0.5 rounded ${isApproved ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                  {factor}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DebateCard;
