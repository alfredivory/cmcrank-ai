'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface AccessRequestRecord {
  id: string;
  email: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  createdAt: string;
  user: {
    name: string | null;
    image: string | null;
  };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-600/20 text-yellow-400',
  APPROVED: 'bg-green-600/20 text-green-400',
  DENIED: 'bg-red-600/20 text-red-400',
};

export default function AdminAccessRequestsTab() {
  const [requests, setRequests] = useState<AccessRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'PENDING' | 'all'>('PENDING');

  const loadRequests = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      const res = await fetch(`/api/admin/access-requests?${params}`);
      const body = await res.json();
      if (res.ok) {
        setRequests(body.data);
      }
    } catch {
      setError('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    loadRequests();
  }, [loadRequests]);

  async function handleAction(requestId: string, action: 'approve' | 'deny') {
    try {
      const res = await fetch('/api/admin/access-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      const body = await res.json();
      if (res.ok) {
        await loadRequests();
      } else {
        setError(body.error || `Failed to ${action} request`);
      }
    } catch {
      setError(`Failed to ${action} request`);
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('PENDING')}
          className={`px-3 py-1 rounded-md text-sm transition-colors ${
            filter === 'PENDING'
              ? 'bg-yellow-600/30 text-yellow-400 border border-yellow-600/50'
              : 'bg-gray-700 text-gray-400 border border-gray-600'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-md text-sm transition-colors ${
            filter === 'all'
              ? 'bg-blue-600/30 text-blue-400 border border-blue-600/50'
              : 'bg-gray-700 text-gray-400 border border-gray-600'
          }`}
        >
          All
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-md text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm animate-pulse">Loading requests...</p>
      ) : requests.length === 0 ? (
        <p className="text-gray-500 text-sm">No access requests found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs uppercase border-b border-gray-700">
                <th className="text-left py-2 pr-4">User</th>
                <th className="text-left py-2 pr-4">Email</th>
                <th className="text-left py-2 pr-4">Status</th>
                <th className="text-left py-2 pr-4">Requested</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-b border-gray-700/50">
                  <td className="py-3 pr-4 flex items-center gap-2">
                    {req.user.image && (
                      <Image src={req.user.image} alt="" width={24} height={24} className="rounded-full" />
                    )}
                    <span>{req.user.name || '—'}</span>
                  </td>
                  <td className="py-3 pr-4 text-gray-400">{req.email}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status]}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-400">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 flex gap-2">
                    {req.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleAction(req.id, 'approve')}
                          className="px-3 py-1 bg-green-600/30 hover:bg-green-600/50 border border-green-600/50 rounded-md text-xs text-green-400 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(req.id, 'deny')}
                          className="px-3 py-1 bg-red-600/30 hover:bg-red-600/50 border border-red-600/50 rounded-md text-xs text-red-400 transition-colors"
                        >
                          Deny
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
