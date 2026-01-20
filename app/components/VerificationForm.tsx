'use client';

import { useState } from 'react';

interface VerificationFormProps {
  sessionToken: string;
  onVerified: (last4: string) => Promise<void>;
  onRespond: (response: 'CONFIRMED' | 'DISPUTED') => Promise<void>;
}

export default function VerificationForm({ sessionToken, onVerified, onRespond }: VerificationFormProps) {
  const [last4, setLast4] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [responding, setResponding] = useState<'CONFIRMED' | 'DISPUTED' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleVerify = async () => {
    try {
      setVerifying(true);
      setMessage(null);
      await onVerified(last4);
      setMessage('Identity verified. Please confirm or dispute the transaction.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleRespond = async (response: 'CONFIRMED' | 'DISPUTED') => {
    try {
      setResponding(response);
      setMessage(null);
      await onRespond(response);
      setMessage(response === 'CONFIRMED' ? 'You confirmed this transaction.' : 'You reported this as fraud.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to submit response');
    } finally {
      setResponding(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Last 4 digits (identity check)</label>
        <input
          value={last4}
          onChange={(e) => setLast4(e.target.value)}
          maxLength={4}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="1234"
        />
      </div>

      <button
        onClick={handleVerify}
        disabled={verifying || last4.length !== 4}
        className="w-full bg-blue-600 text-white rounded-lg py-2 font-semibold hover:bg-blue-700 disabled:bg-gray-300"
      >
        {verifying ? 'Verifying...' : 'Verify Identity'}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => handleRespond('CONFIRMED')}
          disabled={responding !== null}
          className="w-full bg-emerald-600 text-white rounded-lg py-2 font-semibold hover:bg-emerald-700 disabled:bg-gray-300"
        >
          {responding === 'CONFIRMED' ? 'Submitting...' : 'Yes, I made this purchase'}
        </button>
        <button
          onClick={() => handleRespond('DISPUTED')}
          disabled={responding !== null}
          className="w-full bg-red-600 text-white rounded-lg py-2 font-semibold hover:bg-red-700 disabled:bg-gray-300"
        >
          {responding === 'DISPUTED' ? 'Submitting...' : 'No, this is fraud'}
        </button>
      </div>

      {message && <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3">{message}</div>}

      <p className="text-xs text-gray-500">Session: {sessionToken}</p>
    </div>
  );
}
