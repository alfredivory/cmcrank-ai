'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import CreditStatus from '@/components/auth/CreditStatus';
import { useResearchStatus } from './ResearchStatusProvider';

interface ResearchTriggerProps {
  tokenId: string;
  slug: string;
  tokenName: string;
  selectedStart?: string;
  selectedEnd?: string;
  compareTokenNames?: string[];
  onClose: () => void;
  onResearchStarted: (researchId: string) => void;
}

const MAX_CONTEXT_LENGTH = 2000;

export default function ResearchTrigger({
  tokenId,
  slug,
  tokenName,
  selectedStart,
  selectedEnd,
  compareTokenNames = [],
  onClose,
  onResearchStarted,
}: ResearchTriggerProps) {
  const [userContext, setUserContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);
  const { startTracking } = useResearchStatus();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when selection changes
  useEffect(() => {
    setUserContext('');
    setError(null);
    setExistingId(null);
    setLoading(false);
  }, [selectedStart, selectedEnd]);

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (selectedStart && selectedEnd) {
      // Small delay to ensure the modal is rendered before focusing
      const timer = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [selectedStart, selectedEnd]);

  const handleTrigger = useCallback(async (forceNew = false) => {
    setLoading(true);
    setError(null);
    setExistingId(null);

    try {
      let finalContext = userContext.trim();
      if (compareTokenNames.length > 0) {
        const hint = `[Comparison context: The user is comparing ${tokenName} against ${compareTokenNames.join(', ')}. If relevant, briefly note how ${tokenName}'s performance relates to these tokens during this period, but keep the primary focus on ${tokenName}.]`;
        finalContext = finalContext ? `${finalContext}\n\n${hint}` : hint;
      }

      const response = await fetch('/api/research/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId,
          startDate: selectedStart,
          endDate: selectedEnd,
          userContext: finalContext || undefined,
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

      startTracking(body.data.researchId, tokenName, slug);
      onResearchStarted(body.data.researchId);
      onClose();
    } catch {
      setError('Failed to trigger research. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userContext, compareTokenNames, tokenName, tokenId, selectedStart, selectedEnd, existingId, slug, startTracking, onResearchStarted, onClose]);

  // Don't render when no range selected
  if (!selectedStart || !selectedEnd) {
    return null;
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading) {
        handleTrigger(false);
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleEscape = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleBackdropClick}
      onKeyDown={handleEscape}
      role="dialog"
      aria-modal="true"
      aria-label="Research trigger"
    >
      <AuthGuard action="trigger AI research">
        <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-5 w-full max-w-md mx-4 space-y-4">
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
            ref={textareaRef}
            value={userContext}
            onChange={(e) => setUserContext(e.target.value.slice(0, MAX_CONTEXT_LENGTH))}
            onKeyDown={handleKeyDown}
            placeholder="Optional: Add context or hints about what to look for..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-blue-500"
            rows={3}
            maxLength={MAX_CONTEXT_LENGTH}
          />

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleTrigger(false)}
              disabled={loading}
              className="py-2 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? 'Triggering...' : 'Investigate This Period'}
            </button>
          </div>
        </div>
      </AuthGuard>
    </div>
  );
}
