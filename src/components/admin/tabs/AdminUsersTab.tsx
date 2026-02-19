'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

type AllowlistOverride = 'FORCE_YES' | 'FORCE_NO' | null;

interface UserRecord {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: 'USER' | 'ADMIN';
  isAllowlisted: boolean;
  allowlistOverride: AllowlistOverride;
  dailyCreditLimit: number | null;
  createdAt: string;
}

function getAllowlistLabel(user: UserRecord): string {
  if (user.allowlistOverride === 'FORCE_YES') return 'Yes (manual)';
  if (user.allowlistOverride === 'FORCE_NO') return 'No (manual)';
  return user.isAllowlisted ? 'Yes (auto)' : 'No';
}

function getAllowlistStyle(user: UserRecord): string {
  if (user.isAllowlisted) return 'bg-green-600/20 text-green-400 hover:bg-green-600/40';
  return 'bg-gray-700 text-gray-500 hover:bg-gray-600 hover:text-gray-300';
}

function getNextOverride(user: UserRecord): AllowlistOverride {
  // Cycle: current state → toggle
  // If currently allowlisted (any reason) → FORCE_NO
  // If currently not allowlisted → FORCE_YES
  if (user.isAllowlisted) return 'FORCE_NO';
  return 'FORCE_YES';
}

export default function AdminUsersTab() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingCredits, setEditingCredits] = useState<string | null>(null);
  const [creditInput, setCreditInput] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/users?${params}`);
      const body = await res.json();
      if (res.ok) {
        setUsers(body.data);
      } else {
        setError(body.error || 'Failed to load users');
      }
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(loadUsers, 300);
    return () => clearTimeout(timeout);
  }, [loadUsers]);

  async function toggleAllowlist(user: UserRecord) {
    const newOverride = getNextOverride(user);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, allowlistOverride: newOverride }),
      });
      const body = await res.json();
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id
              ? { ...u, isAllowlisted: body.data.isAllowlisted, allowlistOverride: newOverride }
              : u
          )
        );
      } else {
        setError(body.error || 'Failed to update allowlist status');
      }
    } catch {
      setError('Failed to update allowlist status');
    }
  }

  async function resetAllowlistOverride(userId: string) {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, allowlistOverride: null }),
      });
      const body = await res.json();
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, isAllowlisted: body.data.isAllowlisted, allowlistOverride: null }
              : u
          )
        );
      } else {
        setError(body.error || 'Failed to reset allowlist override');
      }
    } catch {
      setError('Failed to reset allowlist override');
    }
  }

  async function toggleRole(userId: string, currentRole: 'USER' | 'ADMIN') {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const body = await res.json();
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      } else {
        setError(body.error || 'Failed to update role');
      }
    } catch {
      setError('Failed to update role');
    }
  }

  async function saveCreditLimit(userId: string) {
    const value = creditInput.trim() === '' ? null : parseInt(creditInput, 10);
    if (value !== null && (isNaN(value) || value < 0)) {
      setError('Credit limit must be a non-negative number or empty for default');
      return;
    }
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, dailyCreditLimit: value }),
      });
      const body = await res.json();
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, dailyCreditLimit: value } : u))
        );
        setEditingCredits(null);
      } else {
        setError(body.error || 'Failed to update credit limit');
      }
    } catch {
      setError('Failed to update credit limit');
    }
  }

  function startEditingCredits(user: UserRecord) {
    setEditingCredits(user.id);
    setCreditInput(user.dailyCreditLimit !== null ? String(user.dailyCreditLimit) : '');
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-md text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm animate-pulse">Loading users...</p>
      ) : users.length === 0 ? (
        <p className="text-gray-500 text-sm">No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs uppercase border-b border-gray-700">
                <th className="text-left py-2 pr-4">User</th>
                <th className="text-left py-2 pr-4">Email</th>
                <th className="text-left py-2 pr-4">Role</th>
                <th className="text-left py-2 pr-4">Allowlisted</th>
                <th className="text-left py-2 pr-4">Credits/Day</th>
                <th className="text-left py-2 pr-4">Joined</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-700/50">
                  <td className="py-3 pr-4 flex items-center gap-2">
                    {user.image && (
                      <Image src={user.image} alt="" width={24} height={24} className="rounded-full" unoptimized />
                    )}
                    <span>{user.name || '—'}</span>
                  </td>
                  <td className="py-3 pr-4 text-gray-400">{user.email || '—'}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-600/20 text-purple-400'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleAllowlist(user)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${getAllowlistStyle(user)}`}
                        title={user.isAllowlisted ? 'Click to deny access' : 'Click to grant access'}
                      >
                        {getAllowlistLabel(user)}
                      </button>
                      {user.allowlistOverride && (
                        <button
                          onClick={() => resetAllowlistOverride(user.id)}
                          className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
                          title="Reset to auto (follow allowlist patterns)"
                        >
                          reset
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    {user.role === 'ADMIN' ? (
                      <span className="text-purple-400 text-xs">Unlimited</span>
                    ) : editingCredits === user.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={creditInput}
                          onChange={(e) => setCreditInput(e.target.value)}
                          placeholder="default"
                          className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveCreditLimit(user.id);
                            if (e.key === 'Escape') setEditingCredits(null);
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => saveCreditLimit(user.id)}
                          className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-600/50 rounded text-xs text-blue-400"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCredits(null)}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-xs text-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditingCredits(user)}
                        className="text-gray-400 hover:text-white text-xs transition-colors"
                        title="Click to edit"
                      >
                        {user.dailyCreditLimit !== null ? user.dailyCreditLimit : 'Default'}
                      </button>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => toggleRole(user.id, user.role)}
                      className={`px-3 py-1 rounded-md text-xs transition-colors ${
                        user.role === 'ADMIN'
                          ? 'bg-red-600/30 hover:bg-red-600/50 border border-red-600/50 text-red-400'
                          : 'bg-purple-600/30 hover:bg-purple-600/50 border border-purple-600/50 text-purple-400'
                      }`}
                    >
                      {user.role === 'ADMIN' ? 'Demote' : 'Promote'}
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
