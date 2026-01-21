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

  // Filter and organize key agents in sequence
  const keyAgents = useMemo(() => {
    const agentSequence = ['Suspicion Agent', 'VOI/Budget Agent', 'L2 Analyst', 'Final Reviewer'];
    const agentSteps: Array<{ agent: string; steps: TimelineItem[] }> = [];
    
    agentSequence.forEach((agentName) => {
      const steps = timeline.filter((step) => 
        step.agentName?.toLowerCase().includes(agentName.toLowerCase().split(' ')[0]) ||
        step.agentName === agentName
      );
      if (steps.length > 0) {
        agentSteps.push({ agent: agentName, steps });
      }
    });
    
    // Add any other agents not in the sequence
    const otherAgents = timeline.filter((step) => 
      !agentSequence.some((seq) => 
        step.agentName?.toLowerCase().includes(seq.toLowerCase().split(' ')[0]) ||
        step.agentName === seq
      )
    );
    if (otherAgents.length > 0) {
      agentSteps.push({ agent: 'Other Agents', steps: otherAgents });
    }
    
    return agentSteps;
  }, [timeline]);

  if (timeline.length === 0) {
    return (
      <div className="rounded-2xl shadow-sm border p-6" style={{ backgroundColor: '#1A1A1A', borderColor: '#262626' }}>
        <h2 className="text-lg font-bold mb-4 font-mono" style={{ color: '#E5E5E5' }}>Agentic Journey</h2>
        <div className="text-center py-12">
          <div className="text-5xl mb-4 animate-bounce">⏳</div>
          <p style={{ color: '#9CA3AF' }}>Initializing agent workflow...</p>
          <p className="text-xs mt-2 font-mono" style={{ color: '#9CA3AF' }}>Agent journey will appear shortly</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-3xl shadow-sm border p-8"
      style={{ backgroundColor: '#1A1A1A', borderColor: '#262626' }}
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black tracking-tight uppercase font-mono" style={{ color: '#E5E5E5' }}>
            Agentic Journey
          </h2>
          <div
            className="w-2.5 h-2.5 rounded-full animate-pulse"
            style={{
              backgroundColor: '#3EB489',
              boxShadow: '0 0 12px rgba(62, 180, 137, 0.5)',
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-3 py-1 rounded-full text-xs font-bold font-mono border"
            style={{ 
              backgroundColor: 'rgba(62, 180, 137, 0.1)',
              color: '#3EB489',
              borderColor: 'rgba(62, 180, 137, 0.3)'
            }}
          >
            {timeline?.length ?? 0} {timeline?.length === 1 ? 'Step' : 'Steps'}
          </span>
        </div>
      </div>

      {/* Agent Sequence Overview */}
      {keyAgents.length > 0 && (
        <div className="mb-6 p-4 rounded-xl border" style={{ backgroundColor: '#121212', borderColor: '#262626' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-3 font-mono" style={{ color: '#9CA3AF' }}>
            Agent Sequence
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {keyAgents.map(({ agent }, index) => (
              <div key={agent} className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: '#262626', color: '#E5E5E5' }}>
                  {agent.replace(' Agent', '').replace('VOI/Budget', 'VOI Budget')}
                </span>
                {index < keyAgents.length - 1 && (
                  <span className="text-mint-500">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Horizontal scrollable container with gap */}
      <div
        ref={timelineRef}
        className="flex flex-row gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory"
        style={{
          scrollBehavior: 'smooth',
        }}
      >
        {timeline?.map((step, index) => {
          // Highlight key agents in the sequence
          const isKeyAgent = keyAgents.some(({ agent, steps }) => 
            steps.some((s) => s.stepNumber === step.stepNumber)
          );
          
          return (
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
          );
        })}
      </div>
    </div>
  );
}
