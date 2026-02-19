'use client';

import { useState } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import CreditStatus from '@/components/auth/CreditStatus';
import ResearchProgress from './ResearchProgress';
import { useResearchStatus } from './ResearchStatusProvider';

interface ResearchTriggerProps {
  tokenId: string;
  slug: string;
  tokenName: string;
  selectedStart?: string;
  selectedEnd?: string;
}

const MAX_CONTEXT_LENGTH = 2000;

export default function ResearchTrigger({
  tokenId,
  slug,
  tokenName,
  selectedStart,
  selectedEnd,
}: ResearchTriggerProps) {
  const [userContext, setUserContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [researchId, setResearchId] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);
  const { startTracking } = useResearchStatus();

  // Suppress unused variable warning — slug reserved for future use
  void slug;

  if (!selectedStart || !selectedEnd) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
        <p className="text-gray-500 text-sm">
          Drag on the chart above to select a date range for AI research
        </p>
      </div>
    );
  }

  const handleTrigger = async (forceNew = false) => {
    setLoading(true);
    setError(null);
    setExistingId(null);

    try {
      const response = await fetch('/api/research/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId,
          startDate: selectedStart,
          endDate: selectedEnd,
          userContext: userContext.trim() || undefined,
          parentResearchId: forceNew ? existingId : undefined,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        setError(body.error || 'Failed to trigger research');
        return;
      }

      if (body.data.status === 'EXISTING') {
        setExistingId(body.data.existingResearchId);
        return;
      }

      setResearchId(body.data.researchId);
      startTracking(body.data.researchId, tokenName, slug);
    } catch {
      setError('Failed to trigger research. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // If research is in progress, show progress indicator
  if (researchId) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <ResearchProgress researchId={researchId} />
      </div>
    );
  }

  return (
    <AuthGuard action="trigger AI research">
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-200">Investigate This Period</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {selectedStart} to {selectedEnd}
            </p>
          </div>
          <CreditStatus />
        </div>

        {existingId && (
          <div className="p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
            <p className="text-sm text-yellow-400">
              Research already exists for this period.{' '}
              <a
                href={`/research/${existingId}`}
                className="underline hover:text-yellow-300"
              >
                View existing report
              </a>
            </p>
            <button
              onClick={() => handleTrigger(true)}
              disabled={loading}
              className="mt-2 text-sm text-yellow-500 hover:text-yellow-400 underline"
            >
              Research Again
            </button>
          </div>
        )}

        <textarea
          value={userContext}
          onChange={(e) => setUserContext(e.target.value.slice(0, MAX_CONTEXT_LENGTH))}
          placeholder="Optional: Add context, links, or hints about what to look for..."
          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-blue-500"
          rows={3}
          maxLength={MAX_CONTEXT_LENGTH}
        />
        <div className="text-xs text-gray-600 text-right">
          {userContext.length}/{MAX_CONTEXT_LENGTH}
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <button
          onClick={() => handleTrigger(false)}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? 'Triggering...' : 'Investigate This Period'}
        </button>
      </div>
    </AuthGuard>
  );
}
