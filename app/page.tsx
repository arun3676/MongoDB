import SubmitForm from './components/SubmitForm';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-gray-900">
            Fraud Escalation Agent
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Agentic fraud detection with x402 paywalled signals
          </p>
          <div className="flex justify-center gap-6 text-sm text-gray-500">
            <span>✓ 4 Autonomous Agents</span>
            <span>✓ MongoDB Atlas State</span>
            <span>✓ Complete Audit Trail</span>
          </div>
        </div>

        {/* Submit Form */}
        <SubmitForm />

        {/* Info Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold text-gray-900 mb-2">Multi-Agent System</h3>
            <p className="text-sm text-gray-600">
              Progressive escalation through L1 Analyst, L2 Analyst, and Final Reviewer agents.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="font-semibold text-gray-900 mb-2">x402 Protocol</h3>
            <p className="text-sm text-gray-600">
              Premium signals purchased via HTTP 402 Payment Required flow with full audit trail.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold text-gray-900 mb-2">MongoDB Atlas</h3>
            <p className="text-sm text-gray-600">
              Shared state, immutable audit ledger, and real-time aggregation pipelines.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Built with Next.js, TypeScript, Tailwind CSS, Fireworks AI, and MongoDB Atlas</p>
        </div>
      </div>
    </main>
  );
}
