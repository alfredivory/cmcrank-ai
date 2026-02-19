'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useResearchStatus } from './ResearchStatusProvider';

const AUTO_DISMISS_MS = 30000;

export default function ResearchNotification() {
  const { activeResearch, dismissResearch } = useResearchStatus();
  const dismissTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Auto-dismiss completed/failed research after 30s
  useEffect(() => {
    const timers = dismissTimers.current;
    for (const research of activeResearch) {
      if (
        (research.status === 'COMPLETE' || research.status === 'FAILED') &&
        !timers.has(research.researchId)
      ) {
        const timer = setTimeout(() => {
          dismissResearch(research.researchId);
          timers.delete(research.researchId);
        }, AUTO_DISMISS_MS);
        timers.set(research.researchId, timer);
      }
    }

    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
    };
  }, [activeResearch, dismissResearch]);

  if (activeResearch.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {activeResearch.map((research) => (
        <div
          key={research.researchId}
          className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 animate-in slide-in-from-right"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              {(research.status === 'PENDING' || research.status === 'RUNNING') && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-sm text-gray-200 truncate">
                    Researching {research.tokenName}...
                  </span>
                </div>
              )}
              {research.status === 'COMPLETE' && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <Link
                    href={`/research/${research.researchId}`}
                    className="text-sm text-green-400 hover:text-green-300 truncate"
                  >
                    Research ready! View report
                  </Link>
                </div>
              )}
              {research.status === 'FAILED' && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-sm text-red-400 truncate">
                    Research failed for {research.tokenName}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => dismissResearch(research.researchId)}
              className="text-gray-500 hover:text-gray-300 text-sm flex-shrink-0"
              aria-label="Dismiss notification"
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
