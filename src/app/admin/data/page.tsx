'use client';

import { useState } from 'react';
import IngestionStatus from '@/components/admin/IngestionStatus';
import TokenScopeSelector from '@/components/admin/TokenScopeSelector';
import BackfillStatus from '@/components/admin/BackfillStatus';

export default function AdminDataPage() {
  const [adminSecret, setAdminSecret] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    // Verify the secret by making a test API call
    try {
      const res = await fetch('/api/admin/config', {
        headers: { 'x-admin-secret': adminSecret },
      });
      if (res.ok) {
        setAuthenticated(true);
      } else {
        alert('Invalid admin secret');
      }
    } catch {
      alert('Failed to connect to API');
    }
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <form onSubmit={handleLogin} className="bg-gray-800/50 rounded-lg p-8 border border-gray-700/50 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6">Admin Access</h1>
          <label className="block text-gray-400 text-sm mb-2">Admin Secret</label>
          <input
            type="password"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-blue-500 mb-4"
            placeholder="Enter admin secret..."
          />
          <button
            type="submit"
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors"
          >
            Login
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Data Management</h1>
        <p className="text-gray-400 mb-8">Manage CMC data ingestion and historical backfill.</p>

        <div className="space-y-6">
          <IngestionStatus adminSecret={adminSecret} />
          <TokenScopeSelector adminSecret={adminSecret} />
          <BackfillStatus adminSecret={adminSecret} />
        </div>
      </div>
    </main>
  );
}
