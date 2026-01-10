/**
 * PAYMENT PROOF CARD - x402 Payment Cycle Visualization
 *
 * Shows the complete 402 → Payment → 200 cycle proving the agent
 * acted as an autonomous economic actor using Coinbase CDP wallet
 */

'use client';

interface PaymentProofCardProps {
  signalType: string;
  cost: number;
  paymentProof?: string;
  txHash?: string;
  walletAddress?: string;
  purchasedAt: Date | string;
  paymentMethod?: string;
}

export default function PaymentProofCard({
  signalType,
  cost,
  paymentProof,
  txHash,
  walletAddress,
  purchasedAt,
  paymentMethod = 'CDP Wallet',
}: PaymentProofCardProps) {
  const formatTimestamp = (ts: Date | string) => {
    const d = typeof ts === 'string' ? new Date(ts) : ts;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200 p-4 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🔐</span>
        <h4 className="text-sm font-bold text-gray-800">x402 Payment Proof</h4>
        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold ml-auto">
          AUTONOMOUS PAYMENT
        </span>
      </div>

      {/* Payment Cycle Visualization */}
      <div className="space-y-3 mb-4">
        {/* Step 1: 402 Payment Required */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-xs font-bold text-red-700">402</span>
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-gray-700">Payment Required</div>
            <div className="text-xs text-gray-500">Signal endpoint returned 402 status</div>
          </div>
          <div className="text-right text-xs font-bold text-gray-700">${cost.toFixed(2)}</div>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center">
          <div className="w-0.5 h-4 bg-purple-300"></div>
        </div>

        {/* Step 2: CDP Payment Executed */}
        <div className="flex items-center gap-3 bg-white rounded-lg p-2">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-xs">💳</span>
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-gray-700">CDP Wallet Payment</div>
            <div className="text-xs text-gray-500">Coinbase Developer Platform (Base Sepolia)</div>
            {walletAddress && (
              <div className="text-xs text-blue-600 font-mono mt-1">
                {walletAddress.substring(0, 10)}...{walletAddress.substring(walletAddress.length - 8)}
              </div>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center">
          <div className="w-0.5 h-4 bg-purple-300"></div>
        </div>

        {/* Step 3: 200 Data Received */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-xs font-bold text-green-700">200</span>
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-gray-700">Data Received</div>
            <div className="text-xs text-gray-500">
              {signalType.charAt(0).toUpperCase() + signalType.slice(1)} signal unlocked
            </div>
          </div>
          <div className="text-xs text-green-600 font-semibold">✓ Verified</div>
        </div>
      </div>

      {/* Payment Details */}
      <div className="border-t border-purple-200 pt-3 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Payment Method:</span>
          <span className="font-semibold text-gray-800">{paymentMethod}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Timestamp:</span>
          <span className="font-semibold text-gray-800">{formatTimestamp(purchasedAt)}</span>
        </div>
        {paymentProof && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Payment Proof:</span>
            <span className="font-mono text-xs text-purple-600">
              {paymentProof.substring(0, 8)}...{paymentProof.substring(paymentProof.length - 6)}
            </span>
          </div>
        )}
        {txHash && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Transaction Hash:</span>
            <a
              href={`https://sepolia.basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-blue-600 hover:underline"
            >
              {txHash.substring(0, 8)}...{txHash.substring(txHash.length - 6)}
            </a>
          </div>
        )}
      </div>

      {/* Economic Actor Badge */}
      <div className="mt-4 pt-3 border-t border-purple-200">
        <div className="bg-purple-100 rounded-lg p-2 text-center">
          <div className="text-xs font-semibold text-purple-800">🤖 Autonomous Economic Actor</div>
          <div className="text-xs text-purple-600 mt-1">
            Agent independently executed payment using CDP wallet
          </div>
        </div>
      </div>
    </div>
  );
}
