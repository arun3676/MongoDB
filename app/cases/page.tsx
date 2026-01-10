'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ExternalLink, Search, Filter, ChevronRight, ShieldCheck, ShieldAlert, Clock, DollarSign } from 'lucide-react';

interface CaseListItem {
    transactionId: string;
    amount: number;
    currency: string;
    userId: string;
    merchantId: string;
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
    createdAt: string;
    totalCost: number;
    finalDecision?: 'APPROVE' | 'DENY';
}

export default function AllCasesPage() {
    const [cases, setCases] = useState<CaseListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchCases = async () => {
            try {
                const res = await fetch('/api/case/list');
                const data = await res.json();
                if (data.success) {
                    setCases(data.cases);
                } else {
                    setError(data.error);
                }
            } catch (err) {
                setError('Failed to load audit history.');
            } finally {
                setLoading(false);
            }
        };

        fetchCases();
    }, []);

    const filteredCases = cases.filter(c =>
        c.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.merchantId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusStyle = (status: string, decision?: string) => {
        if (status === 'PROCESSING') return 'bg-blue-50 text-blue-600 border-blue-100';
        if (status === 'FAILED') return 'bg-red-50 text-red-600 border-red-100';
        if (decision === 'APPROVE') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        if (decision === 'DENY') return 'bg-orange-50 text-orange-600 border-orange-100';
        return 'bg-gray-50 text-gray-500 border-gray-100';
    };

    return (
        <div className="max-w-7xl mx-auto space-y-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Operational Oversight</p>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Audit History</h1>
                    <p className="text-gray-500 font-medium text-sm mt-1">Immutable record of all neural evaluations conducted by the cluster.</p>
                </div>

                <div className="relative w-full md:w-80">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 shadow-sm"
                        placeholder="Search transaction, user, or merchant..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/20 overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center">
                        <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Retrieving Ledger...</p>
                    </div>
                ) : error ? (
                    <div className="p-20 text-center text-red-500">
                        <p className="font-bold uppercase tracking-widest text-[10px]">Critical Error</p>
                        <p className="text-lg font-medium mt-2">{error}</p>
                    </div>
                ) : filteredCases.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="text-4xl mb-4">📂</div>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No cases found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction ID</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Entity</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Value</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredCases.map((c) => (
                                    <tr key={c.transactionId} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${c.finalDecision === 'DENY' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
                                                    {c.finalDecision === 'DENY' ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                                                </div>
                                                <span className="text-sm font-black text-gray-900 mono">{c.transactionId}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span className="text-xs font-bold">{formatDate(c.createdAt)}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-gray-900 truncate max-w-[150px]">{c.userId}</p>
                                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-tighter truncate max-w-[150px]">{c.merchantId}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-gray-900">${c.amount.toLocaleString()}</span>
                                                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tight">${c.totalCost.toFixed(2)} Fee</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(c.status, c.finalDecision)}`}>
                                                {c.status === 'COMPLETED' ? (c.finalDecision || 'COMPLETED') : c.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <Link
                                                href={`/case/${c.transactionId}`}
                                                className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 text-gray-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all active:scale-95 shadow-sm"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
