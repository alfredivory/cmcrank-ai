'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

interface ResearchItem {
  id: string;
  tokenId: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  status: 'COMPLETE' | 'RUNNING' | 'PENDING' | 'FAILED';
  importanceScore: number;
  isVisible: boolean;
  createdAt: string;
  token: { name: string; symbol: string; slug: string };
  triggeredBy: { name: string | null; email: string | null } | null;
  feedback: { thumbsUp: number; thumbsDown: number };
}

interface PaginatedResponse {
  items: ResearchItem[];
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETE: 'bg-green-600/20 text-green-400',
  RUNNING: 'bg-blue-600/20 text-blue-400',
  PENDING: 'bg-yellow-600/20 text-yellow-400',
  FAILED: 'bg-red-600/20 text-red-400',
};

function getImportanceColor(score: number): string {
  if (score >= 81) return 'text-red-400';
  if (score >= 61) return 'text-orange-400';
  if (score >= 31) return 'text-yellow-400';
  return 'text-gray-400';
}

type StatusFilter = 'all' | 'COMPLETE' | 'RUNNING' | 'PENDING' | 'FAILED';
type VisibilityFilter = 'all' | 'visible' | 'hidden';

export default function AdminResearchTab() {
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
  const [pagination, setPagination] = useState({ total: 0, offset: 0, limit: 20, hasMore: false });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const loadResearch = useCallback(async (offset = 0) => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (visibilityFilter !== 'all') params.set('visibility', visibilityFilter);
      params.set('limit', '20');
      params.set('offset', String(offset));

      const res = await fetch(`/api/admin/research?${params}`);
      const body = await res.json();
      if (res.ok) {
        const data = body.data as PaginatedResponse;
        setItems(data.items);
        setPagination(data.pagination);
      } else {
        setError(body.error || 'Failed to load research');
      }
    } catch {
      setError('Failed to load research');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, visibilityFilter]);

  useEffect(() => {
    setLoading(true);
    loadResearch(0);
  }, [loadResearch]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      loadResearch(0);
    }, 300);
  }

  async function toggleVisibility(researchId: string, currentVisible: boolean) {
    const newVisible = !currentVisible;
    // Optimistic update
    setItems((prev) => prev.map((r) => (r.id === researchId ? { ...r, isVisible: newVisible } : r)));

    try {
      const res = await fetch('/api/admin/research', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ researchId, isVisible: newVisible }),
      });
      if (!res.ok) {
        // Revert on failure
        setItems((prev) => prev.map((r) => (r.id === researchId ? { ...r, isVisible: currentVisible } : r)));
        const body = await res.json();
        setError(body.error || 'Failed to toggle visibility');
      }
    } catch {
      setItems((prev) => prev.map((r) => (r.id === researchId ? { ...r, isVisible: currentVisible } : r)));
      setError('Failed to toggle visibility');
    }
  }

  const statusOptions: StatusFilter[] = ['all', 'COMPLETE', 'RUNNING', 'PENDING', 'FAILED'];
  const visibilityOptions: VisibilityFilter[] = ['all', 'visible', 'hidden'];

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by token name or symbol..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full max-w-sm px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex gap-1">
          <span className="text-xs text-gray-500 self-center mr-1">Status:</span>
          {statusOptions.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600/30 text-blue-400 border border-blue-600/50'
                  : 'bg-gray-700 text-gray-400 border border-gray-600'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <span className="text-xs text-gray-500 self-center mr-1">Visibility:</span>
          {visibilityOptions.map((v) => (
            <button
              key={v}
              onClick={() => setVisibilityFilter(v)}
              className={`px-3 py-1 rounded-md text-xs transition-colors ${
                visibilityFilter === v
                  ? 'bg-blue-600/30 text-blue-400 border border-blue-600/50'
                  : 'bg-gray-700 text-gray-400 border border-gray-600'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-md text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm animate-pulse">Loading research...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500 text-sm">No research found.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs uppercase border-b border-gray-700">
                  <th className="text-left py-2 pr-4">Token</th>
                  <th className="text-left py-2 pr-4">Date Range</th>
                  <th className="text-left py-2 pr-4">Status</th>
                  <th className="text-left py-2 pr-4">Importance</th>
                  <th className="text-left py-2 pr-4">Feedback</th>
                  <th className="text-left py-2 pr-4">Visible</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-700/50">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{item.token.name}</div>
                      <div className="text-gray-500 text-xs">{item.token.symbol}</div>
                    </td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">
                      {new Date(item.dateRangeStart).toLocaleDateString()} &ndash;{' '}
                      {new Date(item.dateRangeEnd).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className={`py-3 pr-4 font-medium ${getImportanceColor(item.importanceScore)}`}>
                      {item.importanceScore}
                    </td>
                    <td className="py-3 pr-4">
                      {item.feedback.thumbsUp > 0 && (
                        <span className="text-green-400 mr-2">{item.feedback.thumbsUp}</span>
                      )}
                      {item.feedback.thumbsDown > 0 && (
                        <span className="text-red-400">{item.feedback.thumbsDown}</span>
                      )}
                      {item.feedback.thumbsUp === 0 && item.feedback.thumbsDown === 0 && (
                        <span className="text-gray-600">&mdash;</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <button
                        onClick={() => toggleVisibility(item.id, item.isVisible)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          item.isVisible
                            ? 'bg-green-600/20 text-green-400 hover:bg-green-600/40'
                            : 'bg-red-600/20 text-red-400 hover:bg-red-600/40'
                        }`}
                      >
                        {item.isVisible ? 'Visible' : 'Hidden'}
                      </button>
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/research/${item.id}`}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        title="View research"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
            <span>
              Showing {pagination.offset + 1}&ndash;{Math.min(pagination.offset + pagination.limit, pagination.total)} of{' '}
              {pagination.total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => { setLoading(true); loadResearch(Math.max(0, pagination.offset - pagination.limit)); }}
                disabled={pagination.offset === 0}
                className="px-3 py-1 bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => { setLoading(true); loadResearch(pagination.offset + pagination.limit); }}
                disabled={!pagination.hasMore}
                className="px-3 py-1 bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
