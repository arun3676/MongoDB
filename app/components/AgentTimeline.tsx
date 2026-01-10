'use client';

import { useEffect, useRef, useMemo } from 'react';
import TimelineStep from './TimelineStep';

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

interface AgentTimelineProps {
  timeline: TimelineItem[];
  payments?: Array<{
    negotiationOutcome?: {
      accepted?: boolean;
      proposedPrice?: number;
    };
    signalType?: string;
    createdAt?: Date | string;
  }>;
}

export default function AgentTimeline({ timeline, payments = [] }: AgentTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const prevTimelineLength = useRef(timeline.length);

  // Memoize negotiation checks for performance
  const negotiationMap = useMemo(() => {
    const map = new Map<number, boolean>();
    timeline.forEach((step, index) => {
      const stepTime = typeof step.timestamp === 'string' ? new Date(step.timestamp) : step.timestamp;

      // Check metadata for negotiation info
      if (step.metadata?.negotiation || step.metadata?.negotiationOutcome) {
        map.set(index, true);
        return;
      }

      // Check output for negotiation outcome
      if (step.output && typeof step.output === 'object') {
        if ('negotiationOutcome' in step.output || 'negotiation' in step.output) {
          map.set(index, true);
          return;
        }
      }

      // Check if action indicates negotiation
      if (step.action?.toLowerCase().includes('negotiat') ||
        step.action?.toLowerCase().includes('haggle')) {
        map.set(index, true);
        return;
      }

      // Check if this step's timestamp matches a payment with negotiation
      const matchingPayment = payments.find((p) => {
        if (!p.negotiationOutcome) return false;
        const paymentTime = p.createdAt ? (typeof p.createdAt === 'string' ? new Date(p.createdAt) : p.createdAt) : null;
        if (!paymentTime) return false;
        // Check if payment happened within 5 seconds of this step
        return Math.abs(stepTime.getTime() - paymentTime.getTime()) < 5000;
      });

      if (matchingPayment) {
        map.set(index, true);
      }
    });
    return map;
  }, [timeline, payments]);

  // Helper to check if a step involves negotiation (uses memoized map)
  const hasNegotiation = (_step: TimelineItem, index: number): boolean => {
    return negotiationMap.get(index) || false;
  };

  // Auto-scroll to latest step when new step appears
  useEffect(() => {
    if (timeline.length > prevTimelineLength.current && timelineRef.current) {
      const lastStep = timelineRef.current.lastElementChild;
      if (lastStep) {
        lastStep.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
      }
    }
    prevTimelineLength.current = timeline.length;
  }, [timeline.length]);

  if (timeline.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Agent Pulse</h2>
        <div className="text-center py-12">
          <div className="text-5xl mb-4 animate-bounce">⏳</div>
          <p className="text-gray-500">Initializing agent workflow...</p>
          <p className="text-xs text-gray-400 mt-2">Agent pulse will appear shortly</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Agent Pulse</h2>
          <div
            className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"
            style={{
              boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)',
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100"
          >
            {timeline?.length ?? 0} {timeline?.length === 1 ? 'Agent Active' : 'Agents Active'}
          </span>
        </div>
      </div>

      {/* Horizontal scrollable container with gap */}
      <div
        ref={timelineRef}
        className="flex flex-row gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory"
        style={{
          scrollBehavior: 'smooth',
        }}
      >
        {timeline?.map((step, index) => (
          <TimelineStep
            key={`${step?.stepNumber}-${step?.agentName}-${index}`}
            stepNumber={step?.stepNumber ?? index}
            agentName={step?.agentName ?? 'Unknown Agent'}
            action={step?.action ?? 'processing'}
            timestamp={step?.timestamp ?? new Date()}
            duration={step?.duration ?? 0}
            input={step?.input}
            output={step?.output}
            metadata={step?.metadata}
            isLast={index === timeline.length - 1}
            hasNegotiation={hasNegotiation(step, index)}
          />
        ))}
      </div>
    </div>
  );
}
