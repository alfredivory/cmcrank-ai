'use client';

export interface ResearchPeriod {
  id: string;
  title: string | null;
  dateRangeStart: string;
  dateRangeEnd: string;
  importanceScore: number;
}

interface ResearchBandTooltipProps {
  research: ResearchPeriod;
  x: number;
  y: number;
}

export default function ResearchBandTooltip({ research, x, y }: ResearchBandTooltipProps) {
  const displayTitle = research.title ?? `${research.dateRangeStart} to ${research.dateRangeEnd}`;

  return (
    <div
      className="absolute pointer-events-none z-20 bg-gray-900/95 border border-emerald-500/40 rounded-lg px-3 py-2 shadow-lg max-w-xs"
      style={{ left: x, top: y, transform: 'translate(-50%, -100%)' }}
    >
      <p className="text-sm font-medium text-emerald-300 truncate">{displayTitle}</p>
      <p className="text-xs text-gray-400 mt-0.5">
        {research.dateRangeStart} to {research.dateRangeEnd}
      </p>
      <p className="text-xs text-gray-500 mt-1">Click to view research</p>
    </div>
  );
}
