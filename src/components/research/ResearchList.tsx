'use client';

import Link from 'next/link';
import type { ResearchListItem } from '@/types/api';

interface ResearchListProps {
  items: ResearchListItem[];
}

function getImportanceBadge(score: number): { label: string; color: string } {
  if (score >= 81) return { label: 'Critical', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
  if (score >= 61) return { label: 'Significant', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
  if (score >= 31) return { label: 'Moderate', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
  return { label: 'Minor', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
}

function getStatusBadge(status: string): { label: string; color: string } {
  switch (status) {
    case 'COMPLETE': return { label: 'Complete', color: 'text-green-400' };
    case 'RUNNING': return { label: 'Running', color: 'text-blue-400' };
    case 'PENDING': return { label: 'Pending', color: 'text-yellow-400' };
    case 'FAILED': return { label: 'Failed', color: 'text-red-400' };
    default: return { label: status, color: 'text-gray-400' };
  }
}

export default function ResearchList({ items }: ResearchListProps) {
  if (items.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
        <p className="text-gray-500 text-sm">No research yet for this token</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-200">Previous Research</h3>
      </div>
      <div className="divide-y divide-gray-700/50">
        {items.map((item) => {
          const importance = getImportanceBadge(item.importanceScore);
          const status = getStatusBadge(item.status);

          return (
            <Link
              key={item.id}
              href={`/research/${item.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm text-gray-200">
                    {item.title ?? `${item.dateRangeStart} to ${item.dateRangeEnd}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.dateRangeStart} to {item.dateRangeEnd}
                    {' '}<span className={status.color}>· {status.label}</span>
                  </p>
                </div>
              </div>
              {item.status === 'COMPLETE' && (
                <span className={`text-xs px-2 py-0.5 rounded border ${importance.color}`}>
                  {importance.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
