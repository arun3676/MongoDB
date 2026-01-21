import GlobalStats from './components/GlobalStats';
import MarketplacePreview from './components/MarketplacePreview';

export default function Home() {
    return (
        <div className="max-w-6xl mx-auto space-y-20">
            {/* Hero Content */}
            <section className="text-center py-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-mint-500/10 border border-mint-500/20 text-[10px] font-black text-mint-500 uppercase tracking-[0.2em] mb-8">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-mint-500"></span>
                    </span>
                    Secure Neural Network Protocol v2
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter leading-tight font-mono">
                    Vigil
                </h1>
                <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed mb-10">
                    Autonomous Economic Fraud Defense
                </p>
                <div className="flex flex-wrap justify-center gap-4 md:gap-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-carbon-400 shadow-sm border border-carbon-300 flex items-center justify-center">🛡️</div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Guardians</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-carbon-400 shadow-sm border border-carbon-300 flex items-center justify-center">📂</div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Immutable Ledger</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-carbon-400 shadow-sm border border-carbon-300 flex items-center justify-center">⛓️‍💥</div>
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
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-2xl mb-6 shadow-sm group-hover:from-blue-600 group-hover:to-indigo-600 transition-all">
                        <span className="group-hover:scale-110 transition-transform">🤖</span>
                    </div>
                    <h3 className="text-lg font-black text-gray-900 mb-3 uppercase tracking-tight">Adaptive Agent Swarm</h3>
                    <p className="text-sm text-gray-600 font-medium leading-relaxed">
                        Sequential agents with adaptive retrieval: Suspicion → Policy → VOI/Budget → Buyer/Decision. Matryoshka embeddings (256-dim L1, 1024-dim L2) optimize cost vs precision.
                    </p>
                </div>

                <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/20 group hover:-translate-y-2 transition-all duration-500">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 flex items-center justify-center text-2xl mb-6 shadow-sm group-hover:from-purple-600 group-hover:to-violet-600 transition-all">
                        <span className="group-hover:scale-110 transition-transform">💠</span>
                    </div>
                    <h3 className="text-lg font-black text-gray-900 mb-3 uppercase tracking-tight">VOI Signal Economics</h3>
                    <p className="text-sm text-gray-600 font-medium leading-relaxed">
                        Value-of-Information reasoning calculates expected ROI before purchasing signals. x402 protocol with Coinbase CDP wallets on Base Sepolia ensures autonomous, auditable payments.
                    </p>
                </div>

                <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/20 group hover:-translate-y-2 transition-all duration-500">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 flex items-center justify-center text-2xl mb-6 shadow-sm group-hover:from-emerald-600 group-hover:to-green-600 transition-all">
                        <span className="group-hover:scale-110 transition-transform">🍃</span>
                    </div>
                    <h3 className="text-lg font-black text-gray-900 mb-3 uppercase tracking-tight">Atlas Vector Search</h3>
                    <p className="text-sm text-gray-600 font-medium leading-relaxed">
                        MongoDB Atlas Vector Search with Matryoshka embeddings enables semantic case matching. Unified state, immutable audit trails, and sub-millisecond retrieval for millions of transactions.
                    </p>
                </div>
            </section>

        </div>
    );
}
