'use client';

import type { RankMovement } from '@/lib/chart-utils';

export interface ResearchPeriod {
  id: string;
  title: string | null;
  dateRangeStart: string;
  dateRangeEnd: string;
  importanceScore: number;
}

const MOVEMENT_STYLES: Record<RankMovement, { border: string; title: string }> = {
  positive: { border: 'border-green-500/40', title: 'text-green-300' },
  negative: { border: 'border-red-500/40', title: 'text-red-300' },
  neutral:  { border: 'border-yellow-500/40', title: 'text-yellow-300' },
};

interface ResearchBandTooltipProps {
  research: ResearchPeriod;
  x: number;
  y: number;
  movement?: RankMovement;
}

export default function ResearchBandTooltip({ research, x, y, movement }: ResearchBandTooltipProps) {
  const displayTitle = research.title ?? `${research.dateRangeStart} to ${research.dateRangeEnd}`;
  const styles = movement ? MOVEMENT_STYLES[movement] : { border: 'border-emerald-500/40', title: 'text-emerald-300' };

  return (
    <div
      className={`absolute pointer-events-none z-20 bg-gray-900/95 border ${styles.border} rounded-lg px-3 py-2 shadow-lg max-w-xs`}
      style={{ left: x, top: y, transform: 'translate(-50%, -100%)' }}
    >
      <p className={`text-sm font-medium ${styles.title} truncate`}>{displayTitle}</p>
      <p className="text-xs text-gray-400 mt-0.5">
        {research.dateRangeStart} to {research.dateRangeEnd}
      </p>
      <p className="text-xs text-gray-500 mt-1">Click to view research</p>
    </div>
  );
}
