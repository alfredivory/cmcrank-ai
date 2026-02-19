'use client';

import { useState, useEffect } from 'react';

interface TokenScopeSelectorProps {
  adminSecret: string;
}

const SCOPE_OPTIONS = [100, 200, 500, 1000];

export default function TokenScopeSelector({ adminSecret }: TokenScopeSelectorProps) {
  const [currentScope, setCurrentScope] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/admin/config', {
          headers: { 'x-admin-secret': adminSecret },
        });
        const data = await res.json();
        if (res.ok && data.data?.token_scope != null) {
          setCurrentScope(data.data.token_scope as number);
        }
      } catch {
        // Config not loaded yet, that's fine
      }
    }
    loadConfig();
  }, [adminSecret]);

  async function updateScope(newScope: number) {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: JSON.stringify({ key: 'token_scope', value: newScope }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to update scope');
        return;
      }

      setCurrentScope(newScope);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
      <h2 className="text-lg font-semibold mb-4">Token Scope</h2>

      <div className="flex items-center gap-4">
        <label className="text-gray-400 text-sm">Track top</label>
        <select
          value={currentScope ?? ''}
          onChange={(e) => updateScope(Number(e.target.value))}
          disabled={saving}
          className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          {currentScope === null && <option value="">Loading...</option>}
          {SCOPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt} tokens
            </option>
          ))}
        </select>
        <span className="text-gray-500 text-sm">by market cap</span>
        {saving && <span className="text-blue-400 text-sm animate-pulse">Saving...</span>}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-900/30 border border-red-700/50 rounded-md text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
