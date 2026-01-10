'use client';

import { useMemo } from 'react';

interface TimelineItem {
  stepNumber: number;
  agentName: string;
  action: string;
  timestamp: string | Date;
  output?: Record<string, any>;
}

interface DebateViewProps {
  timeline: TimelineItem[];
}

const cardBase = 'rounded-xl border p-5 shadow-sm';

export default function DebateView({ timeline }: DebateViewProps) {
  const defenseStep = useMemo(
    () => [...(timeline || [])].reverse().find((step) => step.agentName === 'Defense Agent' && step.action === 'DEFENSE_ARGUMENT'),
    [timeline]
  );
  const prosecutionStep = useMemo(
    () => [...(timeline || [])].reverse().find((step) => step.agentName === 'Prosecution Agent' && step.action === 'PROSECUTION_ARGUMENT'),
    [timeline]
  );
  const verdictStep = useMemo(
    () => [...(timeline || [])].reverse().find((step) => step.agentName === 'Arbiter Agent' && step.action === 'ARBITER_VERDICT'),
    [timeline]
  );

  const hasDebate = defenseStep || prosecutionStep || verdictStep;

  const defensePoints = Array.isArray(defenseStep?.output?.keyPoints)
    ? (defenseStep?.output?.keyPoints as string[])
    : undefined;
  const prosecutionPoints = Array.isArray(prosecutionStep?.output?.keyPoints)
    ? (prosecutionStep?.output?.keyPoints as string[])
    : undefined;

  if (!hasDebate) {
    return (
      <div className={`${cardBase} border-dashed border-gray-300 bg-white`}>
        <p className="text-sm font-semibold text-gray-700">Awaiting Tribunal Consensus...</p>
        <p className="mt-1 text-sm text-gray-500">
          The prosecution and defense agents will appear here once the debate starts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={`${cardBase} border-green-100 bg-green-50`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <div>
              <p className="text-sm font-semibold text-green-800">Defense Agent</p>
              <p className="text-xs text-green-600">
                {defenseStep?.output?.confidence
                  ? `${Math.round(defenseStep.output.confidence * 100)}% confident`
                  : 'Confidence pending'}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-green-900">
            {defenseStep?.output?.reasoning || 'Defense argument loading...'}
          </p>
          {defensePoints && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-green-800">
              {defensePoints.map((point, idx) => (
                <li key={`defense-point-${idx}`}>{point}</li>
              ))}
            </ul>
          )}
        </div>
        <div className={`${cardBase} border-red-100 bg-red-50`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚔️</span>
            <div>
              <p className="text-sm font-semibold text-red-800">Prosecution Agent</p>
              <p className="text-xs text-red-600">
                {prosecutionStep?.output?.confidence
                  ? `${Math.round(prosecutionStep.output.confidence * 100)}% confident`
                  : 'Confidence pending'}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-red-900">
            {prosecutionStep?.output?.reasoning || 'Prosecution argument loading...'}
          </p>
          {prosecutionPoints && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-red-800">
              {prosecutionPoints.map((point, idx) => (
                <li key={`prosecution-point-${idx}`}>{point}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={`${cardBase} border-indigo-100 bg-white`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚖️</span>
          <div>
            <p className="text-sm font-semibold text-indigo-900">Tribunal Verdict</p>
            <p className="text-xs text-indigo-500">
              {verdictStep?.output?.confidence
                ? `${Math.round(verdictStep.output.confidence * 100)}% confidence`
                : 'Deliberating'}
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-700">
          {verdictStep?.output?.reasoning || 'Awaiting Arbiter decision...'}
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
            Decision: {verdictStep?.output?.decision || 'PENDING'}
          </span>
          {typeof verdictStep?.output?.defenseStrength === 'number' && (
            <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">
              Defense Strength: {Math.round(verdictStep.output.defenseStrength * 100)}%
            </span>
          )}
          {typeof verdictStep?.output?.prosecutionStrength === 'number' && (
            <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">
              Prosecution Strength: {Math.round(verdictStep.output.prosecutionStrength * 100)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
