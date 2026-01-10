'use client';

import { useEffect, useState } from 'react';

interface GlobalStatsPayload {
  stats: {
    totalFraudPrevented: number;
    efficiencyGain: number;
    averageConfidence: number;
    totalCases: number;
    lowRiskCasesAvoided: number;
    arbiterDecisions: number;
  };
}

const cardBase =
  'flex flex-col gap-2 rounded-2xl border px-6 py-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition hover:-translate-y-1';

const cardThemes = {
  gold: {
    border: 'border-[#D4AF37]/60',
    text: 'text-[#FFE9A8]',
    glow: 'shadow-[0_0_30px_rgba(212,175,55,0.35)]',
  },
  silver: {
    border: 'border-[#C0C0C0]/60',
    text: 'text-[#E5E7EB]',
    glow: 'shadow-[0_0_30px_rgba(192,192,192,0.25)]',
  },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value || 0);
}

function formatPercentage(value: number) {
  return `${(value || 0).toFixed(1)}%`;
}

export default function GlobalStats() {
  const [data, setData] = useState<GlobalStatsPayload['stats'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats/global');
        if (!res.ok) throw new Error('Failed to fetch global stats');
        const payload: GlobalStatsPayload = await res.json();
        if (!isMounted) return;
        setData(payload.stats);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Unable to load mission control');
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const cards = [
    {
      title: 'Total Fraud Prevented',
      value: formatCurrency(data?.totalFraudPrevented ?? 0),
      subtitle: data ? `${data.totalCases} completed cases` : 'Monitoring ledger...',
      accent: 'gold' as const,
      icon: '🛡️',
    },
    {
      title: 'Efficiency Gain',
      value: formatCurrency(data?.efficiencyGain ?? 0),
      subtitle: data
        ? `${data.lowRiskCasesAvoided} low-risk cases skipped network signal`
        : 'Calibrating budgets...',
      accent: 'silver' as const,
      icon: '⚙️',
    },
    {
      title: 'System Accuracy',
      value: formatPercentage(data?.averageConfidence ?? 0),
      subtitle: data ? `${data.arbiterDecisions} tribunal verdicts` : 'Aligning arbiters...',
      accent: 'gold' as const,
      icon: '⚖️',
    },
  ];

  return (
    <section
      className="rounded-3xl border border-[#1C1C20] bg-gradient-to-br from-[#0D0D10] via-[#0B0B0F] to-[#050506] p-6 text-white shadow-[0_25px_70px_rgba(0,0,0,0.65)]"
      aria-label="Global Mission Control"
    >
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#C0C0C0]">
          Mission Control
        </p>
        <h2 className="text-3xl font-semibold text-white">Global Intelligence Dashboard</h2>
        <p className="text-sm text-gray-400">
          Live aggregation from MongoDB Atlas · proves scale beyond a single case.
        </p>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const theme = cardThemes[card.accent];
          return (
            <div
              key={card.title}
              className={`${cardBase} ${theme.border} ${theme.glow}`}
            >
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>{card.title}</span>
                <span>{card.icon}</span>
              </div>
              <p className={`text-4xl font-bold ${theme.text}`}>{card.value}</p>
              <p className="text-xs text-gray-500">{card.subtitle}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
