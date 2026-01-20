'use client';

import Link from 'next/link';
import { ExternalLink, Clock, ShieldCheck, ShieldAlert } from 'lucide-react';

interface Activity {
  transactionId: string;
  status: string;
  amount: number;
  finalDecision?: string;
  createdAt: Date | string;
  totalCost: number;
}

interface Props {
  activities: Activity[];
}

export default function ActivityFeed({ activities }: Props) {
  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  };

  const getStatusColor = (status: string, decision?: string) => {
    if (status === 'PROCESSING') return 'bg-blue-100 text-blue-600 border-blue-200';
    if (status === 'COMPLETED' && decision === 'APPROVE') return 'bg-emerald-100 text-emerald-600 border-emerald-200';
    if (status === 'COMPLETED' && decision === 'DENY') return 'bg-orange-100 text-orange-600 border-orange-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-gray-100 p-12 text-center">
        <div className="text-4xl mb-4">📋</div>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-2">No Recent Activity</p>
        <p className="text-gray-500 text-sm">Case activity will appear here in real-time</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-xl shadow-gray-200/20">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Real-Time Activity Feed</h2>
        <p className="text-gray-500 text-sm font-medium">Live case processing and agent actions</p>
      </div>

      <div className="space-y-3">
        {activities.map((activity) => (
          <Link
            key={activity.transactionId}
            href={`/case/${activity.transactionId}`}
            className="block bg-gray-50 hover:bg-blue-50 rounded-xl p-4 border border-gray-100 hover:border-blue-200 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${getStatusColor(activity.status, activity.finalDecision)}`}>
                  {activity.status === 'PROCESSING' ? (
                    <Clock className="w-5 h-5" />
                  ) : activity.finalDecision === 'DENY' ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : (
                    <ShieldCheck className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-black text-gray-900 font-mono truncate">
                      {activity.transactionId}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(activity.status, activity.finalDecision)}`}>
                      {activity.status === 'COMPLETED' ? (activity.finalDecision || 'COMPLETED') : activity.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="font-bold">${activity.amount.toLocaleString()}</span>
                    <span>•</span>
                    <span className="font-bold">${activity.totalCost.toFixed(2)} cost</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(activity.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
