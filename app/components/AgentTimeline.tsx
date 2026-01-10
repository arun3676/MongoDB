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
      <div className="glass-card p-6">
        <h2 className="heading-md mb-4 text-[var(--text-primary)]">Agent Pulse</h2>
        <div className="text-center py-12">
          <div className="text-5xl mb-4 animate-pulse-mint">⏳</div>
          <p className="text-[var(--text-secondary)]">Initializing agent workflow...</p>
          <p className="text-sm text-[var(--text-muted)] mt-2">Agent pulse will appear shortly</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-card p-6"
      style={{
        background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(23, 25, 35, 0.9))',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="heading-md text-[var(--text-primary)]">Agent Pulse</h2>
          <div
            className="w-2 h-2 rounded-full bg-[var(--mint)] animate-pulse"
            style={{
              boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)',
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span
            className="badge badge-info font-medium"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            {timeline?.length ?? 0} {timeline?.length === 1 ? 'agent' : 'agents'}
          </span>
        </div>
      </div>

      {/* Horizontal scrollable container with gap */}
      <div
        ref={timelineRef}
        className="flex flex-row gap-4 overflow-x-auto pb-4 snap-x snap-mandatory"
        style={{
          scrollbarColor: 'rgba(16, 185, 129, 0.4) rgba(23, 25, 35, 0.5)',
          scrollbarWidth: 'thin',
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
