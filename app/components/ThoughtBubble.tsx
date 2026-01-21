'use client';

import { useState } from 'react';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';

interface ThoughtBubbleProps {
  reasoning?: string;
  thinking?: string;
  isThinking?: boolean;
}

export default function ThoughtBubble({ reasoning, thinking, isThinking = false }: ThoughtBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const thoughtText = reasoning || thinking || '';
  const hasThoughts = thoughtText.length > 0;

  if (!hasThoughts && !isThinking) {
    return null;
  }

  return (
    <div className="mt-3">
      {isThinking && !hasThoughts ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-mint-500/10 border border-mint-500/20">
          <Brain className="w-4 h-4 text-mint-500 animate-pulse" />
          <span className="text-xs font-mono text-mint-500">Thinking...</span>
        </div>
      ) : hasThoughts ? (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#262626', backgroundColor: '#121212' }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-carbon-400 transition-colors"
            style={{ backgroundColor: isExpanded ? '#1A1A1A' : '#121212' }}
          >
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-mint-500" />
              <span className="text-xs font-mono font-semibold" style={{ color: '#E5E5E5' }}>
                {isExpanded ? 'Hide Reasoning' : 'Show Reasoning'}
              </span>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" style={{ color: '#9CA3AF' }} />
            ) : (
              <ChevronDown className="w-4 h-4" style={{ color: '#9CA3AF' }} />
            )}
          </button>
          {isExpanded && (
            <div className="px-3 py-3 border-t" style={{ borderColor: '#262626' }}>
              <p className="text-xs font-mono leading-relaxed whitespace-pre-wrap" style={{ color: '#9CA3AF' }}>
                {thoughtText}
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
