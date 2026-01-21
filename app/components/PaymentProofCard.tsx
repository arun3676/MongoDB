'use client';

import { ExternalLink, Shield, CheckCircle2 } from 'lucide-react';

interface PaymentProofCardProps {
  payments: Array<{
    paymentId?: string;
    signalType?: string;
    amount?: number;
    cdpDetails?: {
      txHash?: string;
      explorerUrl?: string;
      walletId?: string;
      networkId?: string;
      mock?: boolean;
    };
    x402Details?: {
      paymentProof?: string;
      initialEndpoint?: string;
      http402Response?: {
        status?: number;
        headers?: Record<string, string>;
        timestamp?: Date | string;
      };
      paymentRequest?: {
        method?: string;
        endpoint?: string;
        body?: Record<string, unknown>;
        timestamp?: Date | string;
      };
      retryRequest?: {
        method?: string;
        endpoint?: string;
        headers?: Record<string, string>;
        timestamp?: Date | string;
      };
      http200Response?: {
        status?: number;
        dataReceived?: boolean;
        timestamp?: Date | string;
      };
    };
    createdAt?: Date | string;
    status?: string;
  }>;
}

export default function PaymentProofCard({ payments }: PaymentProofCardProps) {
  const x402Payments = payments.filter(
    (p) => p.x402Details && p.status === 'COMPLETED' && p.cdpDetails
  );

  if (x402Payments.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border shadow-sm p-6" style={{ backgroundColor: '#1A1A1A', borderColor: '#262626' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#3EB48920' }}>
          <Shield className="w-5 h-5 text-mint-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold" style={{ color: '#E5E5E5' }}>x402 Payment Proof</h3>
          <p className="text-xs font-mono" style={{ color: '#9CA3AF' }}>Proof of Signal Procurement</p>
        </div>
      </div>

      <div className="space-y-4">
        {x402Payments.map((payment, index) => (
          <div
            key={payment.paymentId || index}
            className="rounded-xl border p-4"
            style={{ backgroundColor: '#121212', borderColor: '#262626' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold font-mono uppercase" style={{ color: '#3EB489' }}>
                    {payment.signalType || 'Unknown'} Signal
                  </span>
                  {payment.status === 'COMPLETED' && (
                    <CheckCircle2 className="w-4 h-4 text-mint-500" />
                  )}
                </div>
                <p className="text-xs font-mono" style={{ color: '#9CA3AF' }}>
                  ${payment.amount?.toFixed(2)} USDC
                </p>
              </div>
            </div>

            {/* CDP Transaction Hash */}
            {payment.cdpDetails?.txHash && (
              <div className="mb-3 pb-3 border-b" style={{ borderColor: '#262626' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#9CA3AF' }}>
                  CDP Transaction Hash
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono px-2 py-1 rounded bg-carbon-500" style={{ color: '#E5E5E5' }}>
                    {payment.cdpDetails.txHash.substring(0, 20)}...
                  </code>
                  {payment.cdpDetails.explorerUrl && (
                    <a
                      href={payment.cdpDetails.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-mono text-mint-500 hover:text-mint-400 transition-colors"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {payment.cdpDetails.walletId && (
                  <p className="text-[10px] font-mono mt-1.5" style={{ color: '#9CA3AF' }}>
                    Wallet: {payment.cdpDetails.walletId.substring(0, 12)}...
                  </p>
                )}
              </div>
            )}

            {/* Payment Proof Token */}
            {payment.x402Details?.paymentProof && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#9CA3AF' }}>
                  Proof of Procurement
                </p>
                <code className="text-xs font-mono px-2 py-1 rounded block bg-carbon-500 break-all" style={{ color: '#E5E5E5' }}>
                  {payment.x402Details.paymentProof}
                </code>
              </div>
            )}

            {/* x402 Flow Timeline */}
            {payment.x402Details && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: '#262626' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#9CA3AF' }}>
                  x402 Flow
                </p>
                <div className="space-y-1.5 text-xs font-mono" style={{ color: '#9CA3AF' }}>
                  {payment.x402Details.http402Response && (
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                      <span>402 Payment Required</span>
                    </div>
                  )}
                  {payment.x402Details.paymentRequest && (
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      <span>Payment Submitted</span>
                    </div>
                  )}
                  {payment.x402Details.retryRequest && (
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-mint-500"></span>
                      <span>Retry with Proof</span>
                    </div>
                  )}
                  {payment.x402Details.http200Response && (
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      <span>200 Signal Received</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
