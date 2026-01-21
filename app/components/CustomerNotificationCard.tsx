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
      <div className="rounded-2xl border p-6 shadow-sm" style={{ backgroundColor: '#1A1A1A', borderColor: '#262626' }}>
        <h3 className="text-lg font-bold font-mono mb-2" style={{ color: '#E5E5E5' }}>Customer Notification</h3>
        <p className="text-sm font-mono" style={{ color: '#9CA3AF' }}>No customer notification sent yet.</p>
      </div>
    );
  }

  const status = verificationSession.status || 'PENDING';
  const response = verificationSession.customerResponse;
  const expiresAt = verificationSession.expiresAt ? new Date(verificationSession.expiresAt) : null;

  const getStatusColor = (status: string) => {
    const statusUpper = status.toUpperCase();
    if (statusUpper === 'VERIFIED' || statusUpper === 'COMPLETED') {
      return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)' };
    }
    if (statusUpper === 'PENDING' || statusUpper === 'WAITING') {
      return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' };
    }
    return { bg: 'rgba(62, 180, 137, 0.15)', text: '#3EB489', border: 'rgba(62, 180, 137, 0.3)' };
  };

  const statusColors = getStatusColor(status);

  return (
    <div className="rounded-2xl border p-6 shadow-sm space-y-3" style={{ backgroundColor: '#1A1A1A', borderColor: '#262626' }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest font-mono" style={{ color: '#3EB489' }}>Customer Notification</p>
          <h3 className="text-lg font-bold font-mono" style={{ color: '#E5E5E5' }}>Verification Session</h3>
        </div>
        <span 
          className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest font-mono border"
          style={{
            backgroundColor: statusColors.bg,
            color: statusColors.text,
            borderColor: statusColors.border
          }}
        >
          {status}
        </span>
      </div>

      <div className="text-sm font-mono space-y-1" style={{ color: '#9CA3AF' }}>
        <p>Session ID: <span className="font-mono" style={{ color: '#E5E5E5' }}>{verificationSession.sessionId}</span></p>
        {expiresAt && <p>Expires: <span style={{ color: '#E5E5E5' }}>{expiresAt.toLocaleString()}</span></p>}
        <p>Identity: <span style={{ color: verificationSession.identityVerified ? '#10B981' : '#F59E0B' }}>{verificationSession.identityVerified ? 'Verified' : 'Pending'}</span></p>
        <p>Customer Response: <span style={{ color: '#E5E5E5' }}>{response || 'Pending'}</span></p>
      </div>
    </div>
  );
}
