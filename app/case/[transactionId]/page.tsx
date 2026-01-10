'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import CaseHeader from '../../components/CaseHeader';
import CostTracker from '../../components/CostTracker';
import AgentTimeline from '../../components/AgentTimeline';
import SignalCard from '../../components/SignalCard';
import DecisionCard from '../../components/DecisionCard';
import DebateCard from '../../components/DebateCard';
import FinalDecision from '../../components/FinalDecision';
import AuditDownload from '../../components/AuditDownload';
import LiveTerminal from '../../components/LiveTerminal';
import DebateView from '../../components/DebateView';

// TypeScript Types
interface Transaction {
  transactionId: string;
  amount: number;
  currency: string;
  userId: string;
  merchantId: string;
  createdAt: Date | string;
  metadata?: Record<string, unknown>;
}

interface TimelineItem {
  stepNumber: number;
  agentName: string;
  action: string;
  timestamp: Date | string;
  duration: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface Signal {
  signalId: string;
  signalType: 'velocity' | 'network';
  transactionId: string;
  userId: string;
  data: Record<string, unknown>;
  cost: number;
  purchasedAt: Date | string;
  purchasedBy: string;
  expiresAt: Date | string;
}

interface PaymentEntry {
  paymentId: string;
  transactionId: string;
  amount: number;
  currency: string;
  signalType: string;
  status: string;
  provider?: string;
  agentName?: string;
  createdAt?: Date | string;
  completedAt?: Date | string;
  cdpDetails?: Record<string, unknown>;
  x402Details?: Record<string, unknown>;
}

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

interface CaseData {
  success: boolean;
  transaction: Transaction;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  timeline: TimelineItem[];
  signals: Signal[];
  decisions: Decision[];
  totalCost: number;
  finalDecision?: {
    decision: 'APPROVE' | 'DENY';
    confidence: number;
    reasoning: string;
    agentDecisionsCount: number;
    signalsCount: number;
    totalCost: number;
    metadata?: {
      llmModel?: string;
    };
    riskFactorsCount?: number;
  };
  debate?: {
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
  };
  payments: PaymentEntry[];
  budget?: {
    spentSoFar: number;
    startingBudget: number;
    remainingBudget: number;
  } | null;
}

export default function CaseDetailPage() {
  const params = useParams();
  const transactionId = params.transactionId as string;

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    if (!isPolling) return;

    const fetchCase = async () => {
      try {
        const res = await fetch(`/api/case/${transactionId}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('Case not found');
          throw new Error('Failed to fetch case');
        }
        const data: CaseData = await res.json();

        setCaseData(data);
        setIsLoading(false);

        // Stop polling when complete or failed
        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          setIsPolling(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setIsLoading(false);
        setIsPolling(false);
      }
    };

    fetchCase(); // Initial fetch
    const interval = setInterval(fetchCase, 2000); // Poll every 2s

    return () => clearInterval(interval);
  }, [transactionId, isPolling]);

  // Loading State
  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
              <div className="grid grid-cols-4 gap-4">
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-gray-600 text-lg">Loading case details...</p>
            <p className="text-gray-500 text-sm mt-2">This may take a few seconds</p>
          </div>
        </div>
      </main>
    );
  }

  // Error State
  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-red-900 mb-2">Error Loading Case</h1>
            <p className="text-red-700 mb-6">{error}</p>
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white py-2 px-6 rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // No data state (shouldn't happen but safety check)
  if (!caseData) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-500">No case data available</p>
        </div>
      </main>
    );
  }

  // Extract arbiter verdict from timeline for the unified verdict header
  const arbiterStep = caseData.timeline
    .slice()
    .reverse()
    .find((step) => step.agentName === 'Arbiter Agent' && step.action === 'ARBITER_VERDICT');

  const arbiterVerdict = arbiterStep
    ? {
      output: arbiterStep.output as { reasoning?: string; decision?: string; confidence?: number },
      metadata: arbiterStep.metadata as { model?: string },
    }
    : undefined;

  // Success State - Render full case detail
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Final Verdict Banner (Always visible) */}
        <div className="mb-8">
          <FinalDecision
            decision={caseData.finalDecision?.decision}
            confidence={caseData.finalDecision?.confidence}
            reasoning={caseData.finalDecision?.reasoning}
            agentDecisionsCount={caseData.decisions.length}
            signalsCount={caseData.signals.length}
            totalCost={caseData.totalCost}
            riskFactorsCount={caseData.finalDecision?.riskFactorsCount || 0}
            transactionId={transactionId}
            arbiterVerdict={arbiterVerdict}
            metadata={caseData.finalDecision?.metadata}
          />
        </div>

        {/* SECOND: Case Header */}
        <CaseHeader transaction={caseData.transaction} status={caseData.status} />

        {/* Cost Tracker */}
        <CostTracker
          totalCost={caseData.totalCost}
          signals={caseData.signals}
          spentSoFar={caseData.budget?.spentSoFar}
        />

        {/* Unified vertical layout */}
        <div className="space-y-6">
          {/* Main sequence: Timeline -> Terminal -> Debate -> Signals -> Decisions */}
          <AgentTimeline timeline={caseData.timeline} payments={caseData.payments} />

          <LiveTerminal transactionId={transactionId} />

          {/* Debate visualization - Prosecution & Defense */}
          <DebateView timeline={caseData.timeline} />

          {/* Consensus/Debate Summary Card (Alternative view) */}
          {caseData.debate && (
            <DebateCard
              defense={caseData.debate.defense}
              prosecution={caseData.debate.prosecution}
              verdict={caseData.debate.verdict}
            />
          )}

          {/* Signals Grid */}
          {caseData.signals.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {caseData.signals.map((signal) => (
                <SignalCard key={signal.signalId} signal={signal} />
              ))}
            </div>
          )}

          {/* Agent Decisions Grid */}
          {caseData.decisions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {caseData.decisions.map((decision) => (
                <DecisionCard key={decision.decisionId} decision={decision} />
              ))}
            </div>
          )}
        </div>

        {/* Audit Download (only when status = COMPLETED) */}
        {caseData.status === 'COMPLETED' && <AuditDownload transactionId={transactionId} />}

        {/* Polling Indicator */}
        {isPolling && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm font-medium">Live updating...</span>
          </div>
        )}
      </div>
    </main>
  );
}
