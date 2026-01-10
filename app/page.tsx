import Marketplace from './components/Marketplace';
import IntegrationBanner from './components/IntegrationBanner';

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-50 selection:bg-blue-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation / Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-xl">M</span>
              </div>
              <span className="text-xl font-black tracking-tight text-gray-900 uppercase">Nexus Market</span>
            </div>
            <p className="text-gray-500 font-medium">The future of modular components and hardware.</p>
          </div>

          <nav className="flex items-center gap-8 text-sm font-semibold text-gray-600">
            <a href="#" className="text-blue-600">Marketplace</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Documentation</a>
            <a href="#" className="bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:scale-95">
              Dashboard
            </a>
          </nav>
        </header>

        {/* Hero Section Placeholder if needed, but we go straight to marketplace */}
        <div className="mb-16">
          <div className="mb-10">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">
              Featured Products
            </h1>
            <p className="text-gray-500 text-lg max-w-2xl font-medium">
              Browse our selection of advanced technology. Every purchase is protected by our
              <span className="text-blue-600 font-bold"> Autonomous Agentic Middleware</span>.
            </p>
          </div>

          {/* Marketplace Grid + Search */}
          <Marketplace />
        </div>

        {/* Integration / Middleware Section */}
        <IntegrationBanner />

        {/* Footer */}
        <footer className="mt-24 pt-12 border-t border-gray-200 pb-12 flex flex-col md:flex-row justify-between items-center gap-6 text-gray-500 text-sm font-medium">
          <p>© 2026 Nexus Market & Fraud Agents. Built on MongoDB Atlas.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Terms</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Support</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
