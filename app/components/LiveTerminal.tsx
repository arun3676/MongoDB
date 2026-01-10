'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface TimelineItem {
  stepNumber: number;
  agentName: string;
  action: string;
  timestamp: string | Date;
  duration?: number;
  metadata?: Record<string, any>;
  output?: Record<string, any>;
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
  createdAt?: string | Date;
  completedAt?: string | Date;
  cdpDetails?: Record<string, any>;
  x402Details?: Record<string, any>;
}

interface Signal {
  signalType: 'velocity' | 'network';
  cost: number;
  purchasedBy: string;
}

interface CasePollResponse {
  timeline: TimelineItem[];
  payments: PaymentEntry[];
  signals?: Signal[];
  totalCost?: number;
}

interface LiveTerminalProps {
  transactionId: string;
}

interface SystemLogEvent {
  id: string;
  timestamp: string | Date;
  type: 'DB_WRITE' | 'x402_AUTH' | 'x402_SUCCESS';
  message: string;
  color: string;
}

const TERMINAL_BG = '#121214';
const TERMINAL_BORDER = '#3B3B3D';
const TERMINAL_HEADER_BG = '#0A0A0B';
const DB_WRITE_COLOR = '#00D4FF';
const x402_AUTH_COLOR = '#F59E0B';
const x402_SUCCESS_COLOR = '#10B981';

function formatTimestamp(dateValue: string | Date): string {
  const date = new Date(dateValue);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function shortenTxHash(hash?: string): string {
  if (!hash || hash === 'unknown') return 'N/A';
  return hash.slice(0, 10);
}

interface TribunalConsensusProps {
  defense?: TimelineItem;
  prosecution?: TimelineItem;
  verdict?: TimelineItem;
}

function TribunalConsensus({ defense, prosecution, verdict }: TribunalConsensusProps) {
  const hasDebate = defense || prosecution || verdict;

  if (!hasDebate) {
    return (
      <div className="mt-6 border-t border-[#1E1E20] pt-4">
        <p className="text-sm font-mono text-[#3B3B3D]">Awaiting Tribunal Consensus...</p>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-[#1E1E20] pt-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-[#2A2A2E] bg-[#151517] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#E86F1B]">Prosecution Agent</p>
          <p className="mt-2 text-sm text-gray-200">{prosecution?.output?.reasoning || 'Building case...'}</p>
          <p className="mt-3 text-xs text-[#3B3B3D]">
            Confidence: {prosecution?.output?.confidence ? `${Math.round(prosecution.output.confidence * 100)}%` : '—'}
          </p>
        </div>
        <div className="rounded-lg border border-[#2A2A2E] bg-[#151517] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Defense Agent</p>
          <p className="mt-2 text-sm text-gray-200">{defense?.output?.reasoning || 'Preparing counter-argument...'}</p>
          <p className="mt-3 text-xs text-[#3B3B3D]">
            Confidence: {defense?.output?.confidence ? `${Math.round(defense.output.confidence * 100)}%` : '—'}
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-[#2A2A2E] bg-[#101012] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Tribunal Verdict</p>
        <p className="mt-2 text-sm text-gray-200">{verdict?.output?.reasoning || 'Awaiting verdict...'}</p>
        <p className="mt-3 text-xs text-[#3B3B3D]">
          Decision:{' '}
          <span className="text-[#00FFC2]">
            {verdict?.output?.decision || verdict?.metadata?.decision || '—'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default function LiveTerminal({ transactionId }: LiveTerminalProps) {
  const [data, setData] = useState<CasePollResponse>({ timeline: [], payments: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchCase = async () => {
      try {
        const res = await fetch(`/api/case/${transactionId}`);
        if (!res.ok) {
          throw new Error(`Failed to load case ${transactionId}`);
        }
        const payload = await res.json();
        if (!isMounted) return;
        setData({
          timeline: payload.timeline || [],
          payments: payload.payments || [],
          signals: payload.signals || [],
          totalCost: payload.totalCost || 0,
        });
        setIsLoading(false);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Unable to load terminal feed');
        setIsLoading(false);
      }
    };

    fetchCase();
    const interval = setInterval(fetchCase, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [transactionId]);

  const systemLogEvents: SystemLogEvent[] = useMemo(() => {
    const events: SystemLogEvent[] = [];

    // Parse timeline for DB_WRITE events
    data.timeline?.forEach((step) => {
      events.push({
        id: `db-write-${step.stepNumber}`,
        timestamp: step.timestamp,
        type: 'DB_WRITE',
        message: `agent_steps updated (step: ${step.stepNumber}, agent: ${step.agentName})`,
        color: DB_WRITE_COLOR,
      });
    });

    // Parse payments for x402 events
    data.payments?.forEach((payment) => {
      const txHash = payment.x402Details?.paymentProof || payment.cdpDetails?.transactionHash;

      // x402_AUTH event (payment required)
      if (payment.createdAt) {
        events.push({
          id: `x402-auth-${payment.paymentId}`,
          timestamp: payment.createdAt,
          type: 'x402_AUTH',
          message: '402 Payment Required -> Triggering CDP Wallet',
          color: x402_AUTH_COLOR,
        });
      }

      // x402_SUCCESS event (payment completed)
      if (payment.status === 'completed' && payment.completedAt) {
        events.push({
          id: `x402-success-${payment.paymentId}`,
          timestamp: payment.completedAt,
          type: 'x402_SUCCESS',
          message: `Payment Confirmed -> Signal Unlocked (tx: ${shortenTxHash(txHash)})`,
          color: x402_SUCCESS_COLOR,
        });
      }
    });

    // Sort chronologically
    return events.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });
  }, [data.timeline, data.payments]);

  useEffect(() => {
    if (!feedRef.current) return;
    feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [systemLogEvents.length]);

  const defenseStep = useMemo(
    () => [...(data.timeline || [])].reverse().find((step) => step.agentName === 'Defense Agent' && step.action === 'DEFENSE_ARGUMENT'),
    [data.timeline]
  );
  const prosecutionStep = useMemo(
    () => [...(data.timeline || [])].reverse().find((step) => step.agentName === 'Prosecution Agent' && step.action === 'PROSECUTION_ARGUMENT'),
    [data.timeline]
  );
  const verdictStep = useMemo(
    () => [...(data.timeline || [])].reverse().find((step) => step.agentName === 'Arbiter Agent' && step.action === 'ARBITER_VERDICT'),
    [data.timeline]
  );

  const totalCost = data.totalCost || 0;
  const signals = data.signals || [];
  const velocitySignal = signals.find((s) => s.signalType === 'velocity');
  const networkSignal = signals.find((s) => s.signalType === 'network');

  return (
    <div
      className="rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.45)] overflow-hidden"
      style={{ border: `1px solid ${TERMINAL_BORDER}` }}
    >
      {/* INTEGRATED COST TRACKER HEADER */}
      <div
        className="px-6 py-4 border-b border-[#1E1E20]"
        style={{ background: TERMINAL_HEADER_BG }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#6B7280]">Total Spent:</span>
              <span className="font-mono text-xl font-bold text-[#10B981]">${totalCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-[#1E3A8A]/20 border border-[#1E3A8A]/40">
              <svg className="h-3.5 w-3.5 text-[#3B82F6]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12zm-1.5-13.5h3v3h-3v-3z"/>
              </svg>
              <span className="font-mono text-xs text-[#93C5FD]">Paid via Base Sepolia</span>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[#10B981] hover:text-[#059669] text-xs font-mono focus:outline-none transition-colors"
          >
            {isExpanded ? '[-] Hide Breakdown' : '[+] Show Breakdown'}
          </button>
        </div>

        {/* Collapsible Cost Breakdown */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-[#1E1E20] space-y-2">
            {velocitySignal ? (
              <div className="flex justify-between items-center text-sm font-mono">
                <span className="text-[#9CA3AF]">
                  Velocity Signal <span className="text-xs text-[#6B7280]">({velocitySignal.purchasedBy})</span>
                </span>
                <span className="text-[#10B981]">${velocitySignal.cost.toFixed(2)}</span>
              </div>
            ) : (
              <div className="flex justify-between items-center text-sm font-mono text-[#4B5563]">
                <span>Velocity Signal</span>
                <span>Not purchased</span>
              </div>
            )}

            {networkSignal ? (
              <div className="flex justify-between items-center text-sm font-mono">
                <span className="text-[#9CA3AF]">
                  Network Signal <span className="text-xs text-[#6B7280]">({networkSignal.purchasedBy})</span>
                </span>
                <span className="text-[#10B981]">${networkSignal.cost.toFixed(2)}</span>
              </div>
            ) : (
              <div className="flex justify-between items-center text-sm font-mono text-[#4B5563]">
                <span>Network Signal</span>
                <span>Not purchased</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SYSTEM LOG TERMINAL */}
      <div className="p-4" style={{ background: TERMINAL_BG }}>
        <div className="flex items-center justify-between border-b border-[#1E1E20] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
            <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
            <span className="h-3 w-3 rounded-full bg-[#28C840]" />
          </div>
          <p className="font-mono text-xs tracking-[0.15em] text-[#10B981]">SYSTEM_LOG</p>
          <span className="text-xs font-mono text-[#3B3B3D]">{transactionId.slice(0, 12)}</span>
        </div>

        <div
          className="max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#3B3B3D] scrollbar-track-transparent"
          ref={feedRef}
          style={{
            animation: isLoading ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
          }}
        >
          {isLoading && (
            <p className="font-mono text-sm text-[#3B3B3D]" style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}>
              Initializing system log...
            </p>
          )}
          {error && (
            <p className="font-mono text-sm text-red-400" style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}>
              ERROR: {error}
            </p>
          )}
          {!isLoading && !error && systemLogEvents.length === 0 && (
            <p className="font-mono text-sm text-[#3B3B3D]" style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}>
              No system events yet. Waiting for activity...
            </p>
          )}
          {!isLoading &&
            !error &&
            systemLogEvents.map((event) => (
              <div key={event.id} className="flex items-start gap-3 py-1.5 hover:bg-[#1A1A1C] px-2 -mx-2 rounded transition-colors">
                <span
                  className="font-mono text-xs text-[#6B7280] shrink-0"
                  style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
                >
                  [{formatTimestamp(event.timestamp)}]
                </span>
                <span
                  className="font-mono text-xs font-semibold shrink-0"
                  style={{ color: event.color, fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
                >
                  {event.type}
                </span>
                <span className="font-mono text-xs text-[#9CA3AF]" style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}>
                  →
                </span>
                <p
                  className="font-mono text-xs text-[#D1D5DB] flex-1"
                  style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
                >
                  {event.message}
                </p>
              </div>
            ))}
        </div>
      </div>

      <TribunalConsensus defense={defenseStep} prosecution={prosecutionStep} verdict={verdictStep} />
    </div>
  );
}
