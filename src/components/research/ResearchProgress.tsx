'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ResearchProgressProps {
  researchId: string;
}

export default function ResearchProgress({ researchId }: ResearchProgressProps) {
  const [status, setStatus] = useState<string>('PENDING');

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(`/api/research/${researchId}/status`);
        if (!response.ok || cancelled) return;
        const body = await response.json();
        setStatus(body.data.status);

        if (body.data.status === 'COMPLETE' || body.data.status === 'FAILED') {
          return; // Stop polling
        }
      } catch {
        // ignore
      }

      if (!cancelled) {
        setTimeout(poll, 2500);
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [researchId]);

  if (status === 'COMPLETE') {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-700/50 rounded-lg">
        <div className="w-3 h-3 bg-green-500 rounded-full" />
        <span className="text-sm text-green-400">Research ready!</span>
        <Link
          href={`/research/${researchId}`}
          className="text-sm text-blue-400 hover:text-blue-300 underline ml-auto"
        >
          View Report
        </Link>
      </div>
    );
  }

  if (status === 'FAILED') {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
        <div className="w-3 h-3 bg-red-500 rounded-full" />
        <span className="text-sm text-red-400">Research failed. Please try again.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-blue-300">
        {status === 'RUNNING' ? 'AI is researching...' : 'Starting research...'}
      </span>
      <span className="text-xs text-gray-500 ml-auto">This usually takes 30-120 seconds</span>
    </div>
  );
}
