'use client';

import { useState } from 'react';

interface IngestionStatusProps {
  adminSecret: string;
}

interface IngestionResult {
  tokensProcessed: number;
  snapshotsCreated: number;
  skipped: number;
  errors: number;
  durationMs: number;
}

export default function IngestionStatus({ adminSecret }: IngestionStatusProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function triggerIngestion() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/admin/ingest', {
        method: 'POST',
        headers: { 'x-admin-secret': adminSecret },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ingestion failed');
        return;
      }

      setResult(data.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Daily Ingestion</h2>
        <button
          onClick={triggerIngestion}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
        >
          {loading ? 'Running...' : 'Run Ingestion Now'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-md text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {result && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-400 text-xs uppercase">Tokens Processed</p>
            <p className="text-xl font-semibold">{result.tokensProcessed}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase">Snapshots Created</p>
            <p className="text-xl font-semibold text-green-400">{result.snapshotsCreated}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase">Skipped</p>
            <p className="text-xl font-semibold text-yellow-400">{result.skipped}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase">Duration</p>
            <p className="text-xl font-semibold">{(result.durationMs / 1000).toFixed(1)}s</p>
          </div>
        </div>
      )}

      {!result && !error && !loading && (
        <p className="text-gray-500 text-sm">Click &quot;Run Ingestion Now&quot; to fetch latest token data from CoinMarketCap.</p>
      )}
    </div>
  );
}
