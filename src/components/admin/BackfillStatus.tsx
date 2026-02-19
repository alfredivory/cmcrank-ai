'use client';

import { useState, useEffect, useCallback } from 'react';

interface BackfillStatusProps {
  adminSecret?: string;
}

function buildHeaders(adminSecret?: string): Record<string, string> {
  return adminSecret ? { 'x-admin-secret': adminSecret } : {};
}

interface BackfillJob {
  id: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  tokenScope: number;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETE' | 'FAILED' | 'PAUSED';
  startedAt: string | null;
  completedAt: string | null;
  tokensProcessed: number;
  lastProcessedCmcId: number | null;
  errors: string[] | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  QUEUED: 'bg-gray-600 text-gray-200',
  RUNNING: 'bg-blue-600 text-blue-100',
  COMPLETE: 'bg-green-600 text-green-100',
  FAILED: 'bg-red-600 text-red-100',
  PAUSED: 'bg-yellow-600 text-yellow-100',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function BackfillStatus({ adminSecret }: BackfillStatusProps) {
  const [jobs, setJobs] = useState<BackfillJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateStart, setDateStart] = useState('2024-02-18');
  const [dateEnd, setDateEnd] = useState('2026-02-18');

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/backfill', {
        headers: buildHeaders(adminSecret),
      });
      const data = await res.json();
      if (res.ok) {
        setJobs(data.data);
      }
    } catch {
      // Will retry on next poll
    } finally {
      setLoading(false);
    }
  }, [adminSecret]);

  useEffect(() => {
    loadJobs();
    // Poll for updates while any job is running
    const interval = setInterval(loadJobs, 5000);
    return () => clearInterval(interval);
  }, [loadJobs]);

  async function startBackfill() {
    setStarting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/backfill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildHeaders(adminSecret),
        },
        body: JSON.stringify({
          dateRangeStart: dateStart,
          dateRangeEnd: dateEnd,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to start backfill');
        return;
      }

      await loadJobs();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStarting(false);
    }
  }

  async function pauseJob(jobId: string) {
    try {
      const res = await fetch('/api/admin/backfill', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...buildHeaders(adminSecret),
        },
        body: JSON.stringify({ jobId, action: 'pause' }),
      });

      if (res.ok) {
        await loadJobs();
      }
    } catch {
      // Will show on next poll
    }
  }

  const hasRunningJob = jobs.some((j) => j.status === 'RUNNING');

  return (
    <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
      <h2 className="text-lg font-semibold mb-4">Historical Backfill</h2>

      {/* Start new backfill */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className="block text-gray-400 text-xs uppercase mb-1">Start Date</label>
          <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs uppercase mb-1">End Date</label>
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={startBackfill}
          disabled={starting || hasRunningJob}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
        >
          {starting ? 'Starting...' : hasRunningJob ? 'Job Running' : 'Start Backfill'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-md text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Job list */}
      {loading ? (
        <p className="text-gray-500 text-sm animate-pulse">Loading jobs...</p>
      ) : jobs.length === 0 ? (
        <p className="text-gray-500 text-sm">No backfill jobs yet. Start one above.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs uppercase border-b border-gray-700">
                <th className="text-left py-2 pr-4">Date Range</th>
                <th className="text-left py-2 pr-4">Scope</th>
                <th className="text-left py-2 pr-4">Status</th>
                <th className="text-left py-2 pr-4">Progress</th>
                <th className="text-left py-2 pr-4">Started</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-gray-700/50">
                  <td className="py-3 pr-4">
                    {formatDate(job.dateRangeStart)} — {formatDate(job.dateRangeEnd)}
                  </td>
                  <td className="py-3 pr-4">{job.tokenScope}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[job.status]}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span>{job.tokensProcessed} / {job.tokenScope}</span>
                      {job.status === 'RUNNING' && (
                        <div className="w-24 bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 rounded-full h-2 transition-all"
                            style={{ width: `${Math.min(100, (job.tokensProcessed / job.tokenScope) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-gray-400">
                    {job.startedAt ? new Date(job.startedAt).toLocaleString() : '—'}
                  </td>
                  <td className="py-3">
                    {job.status === 'RUNNING' && (
                      <button
                        onClick={() => pauseJob(job.id)}
                        className="px-3 py-1 bg-yellow-600/30 hover:bg-yellow-600/50 border border-yellow-600/50 rounded-md text-xs text-yellow-400 transition-colors"
                      >
                        Pause
                      </button>
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
