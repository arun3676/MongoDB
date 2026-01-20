'use client';

interface VerificationSession {
  sessionId: string;
  status: string;
  expiresAt?: string | Date;
  customerResponse?: string;
  identityVerified?: boolean;
  createdAt?: string | Date;
}

interface Props {
  verificationSession: VerificationSession | null;
}

export default function CustomerNotificationCard({ verificationSession }: Props) {
  if (!verificationSession) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Customer Notification</h3>
        <p className="text-sm text-gray-600">No customer notification sent yet.</p>
      </div>
    );
  }

  const status = verificationSession.status || 'PENDING';
  const response = verificationSession.customerResponse;
  const expiresAt = verificationSession.expiresAt ? new Date(verificationSession.expiresAt) : null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Customer Notification</p>
          <h3 className="text-lg font-bold text-gray-900">Verification Session</h3>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100">
          {status}
        </span>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <p>Session ID: <span className="font-mono">{verificationSession.sessionId}</span></p>
        {expiresAt && <p>Expires: {expiresAt.toLocaleString()}</p>}
        <p>Identity: {verificationSession.identityVerified ? 'Verified' : 'Pending'}</p>
        <p>Customer Response: {response || 'Pending'}</p>
      </div>
    </div>
  );
}
