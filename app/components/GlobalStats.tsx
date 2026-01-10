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
            title: 'Fraud Prevented',
            value: formatCurrency(data?.totalFraudPrevented ?? 0),
            subtitle: data ? `${data.totalCases} cases audited` : 'Scanning ledger...',
            icon: '🛡️',
            color: 'blue'
        },
        {
            title: 'Efficiency Gain',
            value: formatCurrency(data?.efficiencyGain ?? 0),
            subtitle: data ? `${data.lowRiskCasesAvoided} optimized steps` : 'Calculating...',
            icon: '⚡',
            color: 'emerald'
        },
        {
            title: 'Verdict Accuracy',
            value: formatPercentage(data?.averageConfidence ?? 0),
            subtitle: data ? `${data.arbiterDecisions} arbitrations` : 'Syncing...',
            icon: '⚖️',
            color: 'indigo'
        },
    ];

    return (
        <section className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-2xl shadow-gray-200/20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Mission Control Live</p>
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Global Intelligence Network</h2>
                    <p className="text-gray-500 font-medium text-sm mt-1">Real-time aggregate data from the distributed Nexus cluster.</p>
                </div>
                {error && <div className="px-4 py-2 bg-red-50 text-red-500 text-xs font-bold rounded-xl border border-red-100">{error}</div>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {cards.map((card) => (
                    <div key={card.title} className="relative group">
                        <div className={`absolute -inset-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-3xl blur opacity-0 group-hover:opacity-5 transition duration-500`}></div>
                        <div className="relative bg-neutral-50/50 rounded-3xl p-8 border border-neutral-100 transition-all duration-300 group-hover:bg-white group-hover:border-blue-100">
                            <div className="flex items-center justify-between mb-6">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-white shadow-sm border border-neutral-100`}>
                                    {card.icon}
                                </div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{card.title}</span>
                            </div>
                            <p className="text-3xl font-black text-gray-900 mb-2">{card.value}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{card.subtitle}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
