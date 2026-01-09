import StatusBadge from './StatusBadge';

interface Transaction {
  transactionId: string;
  amount: number;
  currency: string;
  userId: string;
  merchantId: string;
  createdAt: Date | string;
  metadata?: Record<string, unknown>;
}

interface CaseHeaderProps {
  transaction: Transaction;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export default function CaseHeader({ transaction, status }: CaseHeaderProps) {
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Fraud Case Analysis</h1>
          <p className="text-sm text-gray-500 font-mono">{transaction.transactionId}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Amount</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(transaction.amount, transaction.currency)}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">User ID</p>
          <p className="text-lg font-medium text-gray-900 font-mono truncate" title={transaction.userId}>
            {transaction.userId}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Merchant ID</p>
          <p className="text-lg font-medium text-gray-900 font-mono truncate" title={transaction.merchantId}>
            {transaction.merchantId}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Created At</p>
          <p className="text-sm font-medium text-gray-900" title={formatDate(transaction.createdAt)}>
            {formatDate(transaction.createdAt)}
          </p>
        </div>
      </div>

      {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Additional Metadata</p>
          <div className="bg-gray-50 rounded-md p-3">
            <pre className="text-xs text-gray-700 overflow-x-auto">
              {JSON.stringify(transaction.metadata, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
