interface StatusBadgeProps {
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    PROCESSING: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      icon: '⏳',
      label: 'Processing',
      animate: true,
    },
    COMPLETED: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      icon: '✅',
      label: 'Completed',
      animate: false,
    },
    FAILED: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      icon: '❌',
      label: 'Failed',
      animate: false,
    },
  };

  const { bg, text, icon, label, animate } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${bg} ${text} ${
        animate ? 'animate-pulse' : ''
      }`}
      role="status"
      aria-label={`Status: ${label}`}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}
