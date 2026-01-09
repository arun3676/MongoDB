'use client';

import { useEffect, useRef } from 'react';
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
}

export default function AgentTimeline({ timeline }: AgentTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const prevTimelineLength = useRef(timeline.length);

  // Auto-scroll to latest step when new step appears
  useEffect(() => {
    if (timeline.length > prevTimelineLength.current && timelineRef.current) {
      const lastStep = timelineRef.current.lastElementChild;
      if (lastStep) {
        lastStep.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    prevTimelineLength.current = timeline.length;
  }, [timeline.length]);

  if (timeline.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Agent Timeline</h2>
        <div className="text-center py-12">
          <div className="text-gray-400 text-5xl mb-4">⏳</div>
          <p className="text-gray-500">Initializing agent workflow...</p>
          <p className="text-sm text-gray-400 mt-2">Timeline will appear shortly</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Agent Timeline</h2>
        <span className="text-sm text-gray-500">
          {timeline.length} {timeline.length === 1 ? 'step' : 'steps'}
        </span>
      </div>

      <div ref={timelineRef} className="space-y-0">
        {timeline.map((step, index) => (
          <TimelineStep
            key={`${step.stepNumber}-${step.agentName}-${index}`}
            stepNumber={step.stepNumber}
            agentName={step.agentName}
            action={step.action}
            timestamp={step.timestamp}
            duration={step.duration}
            input={step.input}
            output={step.output}
            metadata={step.metadata}
            isLast={index === timeline.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
