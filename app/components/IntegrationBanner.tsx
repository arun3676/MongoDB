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
        <section className="mt-24 p-8 bg-slate-900 rounded-[2.5rem] text-white overflow-hidden relative border border-slate-800">
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full"></div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-4 uppercase tracking-wider">
                        Enterprise Middleware
                    </div>
                    <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Secure Your Checkout with Signal Intelligence
                    </h2>
                    <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                        Integrate our multi-agent fraud detection as a middleware in your existing stack.
                        Connect to your company's MongoDB signal data and verify transactions in real-time.
                    </p>

                    <div className="space-y-4">
                        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Your API Key</label>
                            <div className="flex items-center gap-3">
                                <code className="flex-1 font-mono text-sm text-blue-300 break-all">{apiKey}</code>
                                <button
                                    onClick={copyToClipboard}
                                    className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                                >
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1 bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                                <div className="text-2xl mb-1">🗄️</div>
                                <div className="text-sm font-bold">Signal Connection</div>
                                <div className="text-xs text-slate-500">MongoDB Atlas Connected</div>
                            </div>
                            <div className="flex-1 bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                                <div className="text-2xl mb-1">🛡️</div>
                                <div className="text-sm font-bold">Agents Active</div>
                                <div className="text-xs text-slate-500">4 Core Evaluators</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 font-mono text-xs shadow-2xl overflow-x-auto">
                    <div className="flex gap-2 mb-4">
                        <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                        <span className="ml-2 text-slate-600">middleware.ts</span>
                    </div>
                    <pre className="text-blue-400">
                        <span className="text-purple-400">import</span> {'{'}{' '}MiddlewareNext{' '}{'}'} <span className="text-purple-400">from</span> <span className="text-green-400">'fraud-agent'</span>;{'\n\n'}
                        <span className="text-slate-500">// Initialize with your MongoDB source</span>{'\n'}
                        <span className="text-purple-400">const</span> agent = <span className="text-purple-400">new</span> Agent({'{'}{'\n'}
                        {'  '}apiKey: <span className="text-green-400">'{apiKey}'</span>,{'\n'}
                        {'  '}db: <span className="text-green-400">'mongodb+srv://...'</span>{'\n'}
                        {'}'});{'\n\n'}
                        <span className="text-purple-400">export async function</span> <span className="text-yellow-400">onPurchase</span>(tx) {'{'}{'\n'}
                        {'  '}<span className="text-slate-500">// Runs agents in parallel with purchase logic</span>{'\n'}
                        {'  '}<span className="text-purple-400">const</span> decision = <span className="text-purple-400">await</span> agent.evaluate(tx);{'\n\n'}
                        {'  '}<span className="text-purple-400">if</span> (decision.fraudScore &gt; <span className="text-orange-400">0.8</span>) {'{'}{'\n'}
                        {'    '}<span className="text-purple-400">return</span> MiddlewareNext.block();{'\n'}
                        {'  '} {'}'}{'\n\n'}
                        {'  '}<span className="text-purple-400">return</span> MiddlewareNext.continue();{'\n'}
                        {'}'}
                    </pre>
                </div>
            </div>
        </section>
    );
}
