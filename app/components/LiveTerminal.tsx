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

const TERMINAL_BG = 'rgba(249, 250, 251, 0.5)'; // Light gray subtle
const TERMINAL_BORDER = 'rgba(229, 231, 235, 1)'; // Gray 200
const TERMINAL_HEADER_BG = 'white';
const DB_WRITE_COLOR = '#0ea5e9'; // Sky 500
const x402_AUTH_COLOR = '#f59e0b'; // Amber 500
const x402_SUCCESS_COLOR = '#10b981'; // Emerald 500

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

    data.timeline?.forEach((step) => {
      events.push({
        id: `db-write-${step.stepNumber}`,
        timestamp: step.timestamp,
        type: 'DB_WRITE',
        message: `agent_steps updated (step: ${step.stepNumber}, agent: ${step.agentName})`,
        color: DB_WRITE_COLOR,
      });
    });

    data.payments?.forEach((payment) => {
      const txHash = payment.x402Details?.paymentProof || payment.cdpDetails?.transactionHash;

      if (payment.createdAt) {
        events.push({
          id: `x402-auth-${payment.paymentId}`,
          timestamp: payment.createdAt,
          type: 'x402_AUTH',
          message: '402 Payment Required -> Triggering CDP Wallet',
          color: x402_AUTH_COLOR,
        });
      }

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

  const totalCost = data.totalCost || 0;
  const signals = data.signals || [];
  const velocitySignal = signals.find((s) => s.signalType === 'velocity');
  const networkSignal = signals.find((s) => s.signalType === 'network');

  return (
    <div
      className="rounded-3xl shadow-sm overflow-hidden bg-white border border-gray-100"
    >
      {/* INTEGRATED COST TRACKER HEADER */}
      <div
        className="px-8 py-6 border-b border-gray-50 bg-white"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Service Cost</span>
              <span className="text-2xl font-black text-gray-900">${totalCost.toFixed(2)}</span>
            </div>
            <div className="h-10 w-px bg-gray-100 hidden sm:block"></div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50/50 border border-blue-100 text-blue-700">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12zm-1.5-13.5h3v3h-3v-3z" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-tight">Base Sepolia Asset</span>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-blue-600 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-1"
          >
            {isExpanded ? 'Hide Details' : 'View Breakdown'}
            <svg className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Collapsible Cost Breakdown */}
        {isExpanded && (
          <div className="mt-6 pt-6 border-t border-gray-50 space-y-3">
            {velocitySignal ? (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">
                  Velocity Signal <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-400 align-middle ml-1">{velocitySignal.purchasedBy}</span>
                </span>
                <span className="text-gray-900 font-bold">${velocitySignal.cost.toFixed(2)}</span>
              </div>
            ) : (
              <div className="flex justify-between items-center text-sm text-gray-300">
                <span>Velocity Signal</span>
                <span>n/a</span>
              </div>
            )}

            {networkSignal ? (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">
                  Network Signal <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-400 align-middle ml-1">{networkSignal.purchasedBy}</span>
                </span>
                <span className="text-gray-900 font-bold">${networkSignal.cost.toFixed(2)}</span>
              </div>
            ) : (
              <div className="flex justify-between items-center text-sm text-gray-300">
                <span>Network Signal</span>
                <span>n/a</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SYSTEM LOG TERMINAL */}
      <div className="p-8 bg-neutral-50/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
            <p className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">System Logs</p>
          </div>
          <span className="text-[10px] font-mono text-gray-400 bg-white border border-gray-100 px-2 py-0.5 rounded uppercase">{transactionId.slice(0, 12)}</span>
        </div>

        <div
          className="max-h-96 overflow-y-auto pr-4 scrollbar-hide space-y-2"
          ref={feedRef}
        >
          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-xs font-medium text-gray-400 italic">Initializing secure log stream...</p>
            </div>
          )}
          {error && (
            <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">
              CRITICAL: {error}
            </p>
          )}
          {!isLoading && !error && systemLogEvents.length === 0 && (
            <p className="text-xs font-medium text-gray-400 text-center py-8">Waiting for agent activity...</p>
          )}
          {!isLoading &&
            !error &&
            systemLogEvents.map((event) => (
              <div key={event.id} className="flex items-start gap-3 py-2 px-3 rounded-xl bg-white border border-neutral-100/50 hover:border-blue-100 transition-colors group">
                <span
                  className="font-mono text-[10px] text-gray-400 mt-0.5 shrink-0"
                >
                  {formatTimestamp(event.timestamp)}
                </span>
                <span
                  className="font-black text-[10px] uppercase tracking-tighter shrink-0 px-1.5 py-0.5 rounded"
                  style={{ color: event.color, background: `${event.color}10` }}
                >
                  {event.type}
                </span>
                <p
                  className="text-[11px] text-gray-600 font-medium flex-1 leading-relaxed"
                >
                  {event.message}
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
