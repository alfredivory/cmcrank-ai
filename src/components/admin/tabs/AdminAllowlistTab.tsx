'use client';

import { useState, useEffect, useCallback } from 'react';

interface AllowlistEntry {
  id: string;
  pattern: string;
  isRegex: boolean;
  createdAt: string;
  createdBy: string | null;
}

export default function AdminAllowlistTab() {
  const [entries, setEntries] = useState<AllowlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPattern, setNewPattern] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [adding, setAdding] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/allowlist');
      const body = await res.json();
      if (res.ok) {
        setEntries(body.data);
      }
    } catch {
      setError('Failed to load allowlist');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  async function addEntry() {
    if (!newPattern.trim()) return;
    setAdding(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/allowlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern: newPattern.trim(), isRegex }),
      });
      const body = await res.json();
      if (res.ok) {
        setNewPattern('');
        setIsRegex(false);
        await loadEntries();
      } else {
        setError(body.error || 'Failed to add entry');
      }
    } catch {
      setError('Failed to add entry');
    } finally {
      setAdding(false);
    }
  }

  async function deleteEntry(id: string) {
    try {
      const res = await fetch(`/api/admin/allowlist?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      } else {
        const body = await res.json();
        setError(body.error || 'Failed to delete entry');
      }
    } catch {
      setError('Failed to delete entry');
    }
  }

  return (
    <div>
      {/* Add new entry */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-gray-400 text-xs uppercase mb-1">Pattern</label>
          <input
            type="text"
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
            placeholder="e.g. *@defuse.org or user@example.com"
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={isRegex}
            onChange={(e) => setIsRegex(e.target.checked)}
            className="rounded border-gray-600"
          />
          Regex
        </label>
        <button
          onClick={addEntry}
          disabled={adding || !newPattern.trim()}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
        >
          {adding ? 'Adding...' : 'Add Entry'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-md text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm animate-pulse">Loading allowlist...</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-500 text-sm">No allowlist entries yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs uppercase border-b border-gray-700">
                <th className="text-left py-2 pr-4">Pattern</th>
                <th className="text-left py-2 pr-4">Type</th>
                <th className="text-left py-2 pr-4">Added</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-700/50">
                  <td className="py-3 pr-4 font-mono text-sm">{entry.pattern}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      entry.isRegex
                        ? 'bg-orange-600/20 text-orange-400'
                        : 'bg-blue-600/20 text-blue-400'
                    }`}>
                      {entry.isRegex ? 'Regex' : 'Pattern'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-400">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="px-3 py-1 bg-red-600/30 hover:bg-red-600/50 border border-red-600/50 rounded-md text-xs text-red-400 transition-colors"
                    >
                      Delete
                    </button>
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
