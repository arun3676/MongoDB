import GlobalStats from './components/GlobalStats';
import MarketplacePreview from './components/MarketplacePreview';

export default function Home() {
    return (
        <div className="max-w-6xl mx-auto space-y-20">
            {/* Hero Content */}
            <section className="text-center py-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-8">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    Secure Neural Network Protocol v2
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-8 tracking-tighter leading-tight italic">
                    High-Speed Fraud <span className="text-blue-600">Neutralization</span>.
                </h1>
                <p className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed mb-10">
                    Autonomous multi-agent cluster conducting real-time forensic analysis
                    on global transactions through the x402 payment corridor.
                </p>
                <div className="flex flex-wrap justify-center gap-4 md:gap-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center">🛡️</div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Guardians</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center">📂</div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Immutable Ledger</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center">⛓️‍💥</div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">x402 Paywalled</span>
                    </div>
                </div>
            </section>

            {/* Marketplace Preview */}
            <section>
                <MarketplacePreview />
            </section>

            {/* Mission Control - compact above swarm */}
            <section>
                <GlobalStats />
            </section>

            {/* Intelligence Cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/20 group hover:-translate-y-2 transition-all duration-500">
                    <div className="w-14 h-14 rounded-2xl bg-neutral-50 flex items-center justify-center text-2xl mb-6 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">🤖</div>
                    <h3 className="text-lg font-black text-gray-900 mb-3 uppercase tracking-tight">Multi-Agent Swarm</h3>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">
                        Parallel evaluation by specialized agents: L1 Suspicion, L2 Policy, and the Arbiter Tribunal.
                    </p>
                </div>

                <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/20 group hover:-translate-y-2 transition-all duration-500">
                    <div className="w-14 h-14 rounded-2xl bg-neutral-50 flex items-center justify-center text-2xl mb-6 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">💠</div>
                    <h3 className="text-lg font-black text-gray-900 mb-3 uppercase tracking-tight">Signal Economics</h3>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">
                        Dynamic cost-benefit analysis ensures high-confidence signals are only acquired when risk justifies expense.
                    </p>
                </div>

                <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/20 group hover:-translate-y-2 transition-all duration-500">
                    <div className="w-14 h-14 rounded-2xl bg-neutral-50 flex items-center justify-center text-2xl mb-6 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">🍃</div>
                    <h3 className="text-lg font-black text-gray-900 mb-3 uppercase tracking-tight">Atlas Backbone</h3>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">
                        Powered by MongoDB Atlas for unified state, historical auditing, and sub-millisecond signal retrieval.
                    </p>
                </div>
            </section>

        </div>
    );
}
