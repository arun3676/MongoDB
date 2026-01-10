'use client';

import { useState } from 'react';

interface AuditDownloadProps {
  transactionId?: string;
  caseData?: unknown;
}

export default function AuditDownload({ transactionId, caseData }: AuditDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    // Validate we have a transaction ID
    if (!transactionId) {
      setError('Transaction ID is required to download audit');
      return;
    }

    setIsDownloading(true);
    setError(null);
    setShowSuccess(false);

    try {
      const response = await fetch(`/api/audit/${transactionId}`);

      if (!response.ok) {
        throw new Error('Failed to download audit packet');
      }

      const data = await response.json();

      // Use optional chaining to handle partial response
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to generate audit packet');
      }

      // Generate audit with optional chaining
      const auditData = data?.audit ?? caseData ?? { transactionId, note: 'Partial data available' };

      // Create blob and download
      const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fraud-audit-${transactionId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0 text-3xl" aria-hidden="true">
            📄
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-200 mb-1">Export Audit Trail</h3>
            <p className="text-xs text-gray-400">
              Download complete immutable audit packet (JSON)
            </p>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={isDownloading || !transactionId}
          className="btn-ghost flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDownloading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-sm">Generating...</span>
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="text-sm">Download</span>
            </>
          )}
        </button>
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <div
          className="mt-4 bg-green-900/30 border border-green-500/40 text-green-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2"
          role="alert"
        >
          <span className="text-lg" aria-hidden="true">
            ✓
          </span>
          <span>Audit packet downloaded successfully!</span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div
          className="mt-4 bg-red-900/30 border border-red-500/40 text-red-300 px-4 py-3 rounded-lg text-sm"
          role="alert"
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-4 glass-panel p-3 rounded-lg border border-gray-700">
        <p className="text-xs text-gray-400">
          <strong className="text-gray-300">Includes:</strong> Transaction details, agent timeline, signal purchases, x402 payments, LLM decisions, and MongoDB snapshots.
        </p>
      </div>
    </div>
  );
}
