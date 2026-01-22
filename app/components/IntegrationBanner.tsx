'use client';

import { useState } from 'react';

export default function IntegrationBanner() {
    const [copied, setCopied] = useState(false);
    const apiKey = 'sk_fraud_402_x92j_m0nd0_db_v2';

    const copyToClipboard = () => {
        navigator.clipboard.writeText(apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <section className="mt-24 p-12 bg-white rounded-[3rem] shadow-2xl shadow-blue-500/5 border border-gray-100 overflow-hidden relative">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-blue-500/5 blur-[100px] rounded-full"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-indigo-500/5 blur-[100px] rounded-full"></div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-black mb-6 uppercase tracking-[0.2em]">
                        Enterprise Middleware
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black mb-8 text-gray-900 tracking-tight leading-[1.1]">
                        Secure Your Checkout with <span className="text-blue-600">Signal Intelligence</span>
                    </h2>
                    <p className="text-gray-500 text-lg mb-10 leading-relaxed font-medium">
                        Integrate our multi-agent fraud detection as a silent middleware.
                        Sync with MongoDB Atlas signal data to verify every transaction in milliseconds.
                    </p>

                    <div className="space-y-6">
                        <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 group transition-all hover:border-blue-200">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Provisioned API Key</label>
                            <div className="flex items-center gap-4">
                                <code className="flex-1 font-mono text-sm text-blue-700 bg-blue-50/50 px-3 py-2 rounded-lg break-all border border-blue-100/50">{apiKey}</code>
                                <button
                                    onClick={copyToClipboard}
                                    className="bg-gray-900 text-white hover:bg-blue-600 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-gray-900/10 active:scale-95 whitespace-nowrap"
                                >
                                    {copied ? 'Copied!' : 'Copy Key'}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                                <div className="text-3xl mb-3">🗄️</div>
                                <div className="text-xs font-black uppercase tracking-tight text-gray-900 mb-1">Signal Source</div>
                                <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Atlas Connected
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                                <div className="text-3xl mb-3">🛡️</div>
                                <div className="text-xs font-black uppercase tracking-tight text-gray-900 mb-1">Active Agents</div>
                                <div className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">4 Core Cluster</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                    <div className="relative bg-neutral-900 rounded-[2rem] p-8 border border-neutral-800 font-mono text-[11px] shadow-2xl overflow-hidden">
                        <div className="flex gap-2 mb-6 border-b border-neutral-800 pb-4">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-400/20"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/20"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-green-400/20"></div>
                            <span className="ml-4 text-neutral-600 text-[10px] uppercase font-bold tracking-widest">middleware.ts</span>
                        </div>
                        <pre className="text-blue-300/90 leading-relaxed">
                            <span className="text-purple-400">import</span> {'{'}{' '}Middleware{' '}{'}'} <span className="text-purple-400">from</span> <span className="text-emerald-400">&apos;fraud-agent&apos;</span>;{'\n\n'}
                            <span className="text-neutral-600">{/* Init with signal source */}</span>{'\n'}
                            <span className="text-purple-400">const</span> guard = <span className="text-purple-400">new</span> Guard({'{'}{'\n'}
                            {'  '}apiKey: <span className="text-emerald-400">&apos;{'{apiKey}'}&apos;</span>,{'\n'}
                            {'  '}db: <span className="text-emerald-400">process.env.DB_URL</span>{'\n'}
                            {'}'});{'\n\n'}
                            <span className="text-purple-400">export async function</span> <span className="text-amber-400">onPurchase</span>(tx) {'{'}{'\n'}
                            {'  '}<span className="text-neutral-600">{/* Agentic evaluation */}</span>{'\n'}
                            {'  '}<span className="text-purple-400">const</span> res = <span className="text-purple-400">await</span> guard.verify(tx);{'\n\n'}
                            {'  '}<span className="text-purple-400">if</span> (res.score &gt; <span className="text-orange-400">0.8</span>) {'{'}{'\n'}
                            {'    '}<span className="text-purple-400">return</span> Next.block();{'\n'}
                            {'  '} {'}'}{'\n\n'}
                            {'  '}<span className="text-purple-400">return</span> Next.continue();{'\n'}
                            {'}'}
                        </pre>
                    </div>
                </div>
            </div>
        </section>
    );
}
