'use client';

import { useState } from 'react';

interface AuditDownloadProps {
  transactionId: string;
}

export default function AuditDownload({ transactionId }: AuditDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    setShowSuccess(false);

    try {
      const response = await fetch(`/api/audit/${transactionId}`);

      if (!response.ok) {
        throw new Error('Failed to download audit packet');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate audit packet');
      }

      // Create blob and download
      const blob = new Blob([JSON.stringify(data.audit, null, 2)], { type: 'application/json' });
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
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 text-4xl" aria-hidden="true">
          📄
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Complete Audit Packet</h3>
          <p className="text-sm text-gray-600 mb-4">
            Download the complete immutable audit trail for this fraud case. Includes all agent decisions, signal
            purchases, payment flows, and timestamps.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 items-start">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-blue-600 text-white py-2.5 px-6 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
                  Generating...
                </>
              ) : (
                <>
                  <span aria-hidden="true">⬇</span>
                  Download Audit Packet (JSON)
                </>
              )}
            </button>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="hidden sm:inline">•</span>
              <span>~15-20KB</span>
            </div>
          </div>

          {/* Success Toast */}
          {showSuccess && (
            <div
              className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm flex items-center gap-2"
              role="alert"
            >
              <span className="text-lg" aria-hidden="true">
                ✅
              </span>
              <span>Audit packet downloaded successfully!</span>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm" role="alert">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Info Box */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-xs text-blue-800">
              <strong>Audit Contents:</strong> Transaction details, complete agent timeline, all signal purchases,
              x402 payment flows, LLM decisions with prompts/responses, and MongoDB collection snapshots.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
