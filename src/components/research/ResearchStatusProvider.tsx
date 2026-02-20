'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface TrackedResearch {
  researchId: string;
  tokenName: string;
  tokenSlug: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETE' | 'FAILED';
}

interface ResearchStatusContextValue {
  activeResearch: TrackedResearch[];
  startTracking: (researchId: string, tokenName: string, tokenSlug: string) => void;
  dismissResearch: (researchId: string) => void;
}

const ResearchStatusContext = createContext<ResearchStatusContextValue>({
  activeResearch: [],
  startTracking: () => {},
  dismissResearch: () => {},
});

export function useResearchStatus() {
  return useContext(ResearchStatusContext);
}

const POLL_INTERVAL = 2500;
const SESSION_STORAGE_KEY = 'cmcrank-active-research';

export default function ResearchStatusProvider({ children }: { children: React.ReactNode }) {
  const [activeResearch, setActiveResearch] = useState<TrackedResearch[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const pollTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // Persist to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(activeResearch));
    } catch {
      // ignore
    }
  }, [activeResearch]);

  const stopPolling = useCallback((researchId: string) => {
    const timer = pollTimers.current.get(researchId);
    if (timer) {
      clearInterval(timer);
      pollTimers.current.delete(researchId);
    }
  }, []);

  const pollStatus = useCallback(async (researchId: string) => {
    try {
      const response = await fetch(`/api/research/${researchId}/status`);
      if (!response.ok) return;
      const body = await response.json();
      const status = body.data.status;

      setActiveResearch((prev) =>
        prev.map((r) => (r.researchId === researchId ? { ...r, status } : r))
      );

      if (status === 'COMPLETE' || status === 'FAILED') {
        stopPolling(researchId);
      }
    } catch {
      // Silently ignore polling errors
    }
  }, [stopPolling]);

  const startTracking = useCallback((researchId: string, tokenName: string, tokenSlug: string) => {
    setActiveResearch((prev) => {
      if (prev.some((r) => r.researchId === researchId)) return prev;
      return [...prev, { researchId, tokenName, tokenSlug, status: 'PENDING' }];
    });

    // Start polling
    const timer = setInterval(() => pollStatus(researchId), POLL_INTERVAL);
    pollTimers.current.set(researchId, timer);
    // Also poll immediately
    pollStatus(researchId);
  }, [pollStatus]);

  const dismissResearch = useCallback((researchId: string) => {
    stopPolling(researchId);
    setActiveResearch((prev) => prev.filter((r) => r.researchId !== researchId));
  }, [stopPolling]);

  // Resume polling for any research that's still pending/running on mount
  useEffect(() => {
    const timers = pollTimers.current;
    for (const research of activeResearch) {
      if (
        (research.status === 'PENDING' || research.status === 'RUNNING') &&
        !timers.has(research.researchId)
      ) {
        const timer = setInterval(() => pollStatus(research.researchId), POLL_INTERVAL);
        timers.set(research.researchId, timer);
        pollStatus(research.researchId);
      }
    }
    // Cleanup on unmount
    return () => {
      for (const timer of timers.values()) {
        clearInterval(timer);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ResearchStatusContext.Provider value={{ activeResearch, startTracking, dismissResearch }}>
      {children}
    </ResearchStatusContext.Provider>
  );
}
