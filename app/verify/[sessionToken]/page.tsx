'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import VerificationForm from '@/app/components/VerificationForm';

interface SessionInfo {
  sessionId: string;
  transactionId: string;
  status: string;
  expiresAt: string;
  identityVerified: boolean;
  customerResponse?: string;
}

export default function VerificationPage() {
  const params = useParams();
  const sessionToken = params.sessionToken as string;
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/verification/${sessionToken}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load session');
      setSession(data.session);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    const interval = setInterval(fetchSession, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  const handleVerify = async (last4: string) => {
    const res = await fetch(`/api/verification/${sessionToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', last4 }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Verification failed');
    await fetchSession();
  };

  const handleRespond = async (response: 'CONFIRMED' | 'DISPUTED') => {
    const res = await fetch(`/api/verification/${sessionToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'respond', response }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Response failed');
    await fetchSession();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Loading verification session...</p>
        </div>
      </main>
    );
  }

  if (error || !session) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-lg font-semibold text-gray-800">Verification unavailable</p>
          <p className="text-sm text-gray-500 mt-2">{error || 'Session not found'}</p>
        </div>
      </main>
    );
  }

  const isExpired = new Date(session.expiresAt) < new Date();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-12 px-6">
        <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Transaction Verification</p>
              <h1 className="text-2xl font-black text-gray-900 mt-1">Confirm recent activity</h1>
              <p className="text-sm text-gray-500 mt-1">Transaction ID: {session.transactionId}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
                isExpired
                  ? 'bg-gray-100 text-gray-500 border border-gray-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {isExpired ? 'Expired' : session.status}
            </span>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <p>
              For your security, please verify your identity and confirm whether you recognize this transaction.
            </p>
            <p className="font-mono text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              Session: {session.sessionId}
            </p>
          </div>

          {session.customerResponse ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              Customer response: <strong>{session.customerResponse}</strong>
            </div>
          ) : isExpired ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              This verification session has expired. Please request a new link.
            </div>
          ) : (
            <VerificationForm
              sessionToken={sessionToken}
              onVerified={handleVerify}
              onRespond={handleRespond}
            />
          )}
        </div>
      </div>
    </main>
  );
}
