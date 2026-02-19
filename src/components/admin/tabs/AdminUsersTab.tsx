'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface UserRecord {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: 'USER' | 'ADMIN';
  isAllowlisted: boolean;
  createdAt: string;
}

export default function AdminUsersTab() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

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
                <th className="text-left py-2 pr-4">Joined</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-700/50">
                  <td className="py-3 pr-4 flex items-center gap-2">
                    {user.image && (
                      <Image src={user.image} alt="" width={24} height={24} className="rounded-full" />
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
                    <span className={user.isAllowlisted ? 'text-green-400' : 'text-gray-500'}>
                      {user.isAllowlisted ? 'Yes' : 'No'}
                    </span>
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
