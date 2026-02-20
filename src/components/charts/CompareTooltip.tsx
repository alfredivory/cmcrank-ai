'use client';

import type { TokenSearchResult, CompareDataPoint } from '@/types/api';
import { COMPARE_COLORS } from '@/lib/chart-utils';

interface CompareTooltipProps {
  data: CompareDataPoint | null;
  tokens: TokenSearchResult[];
  normalize: boolean;
}

export default function CompareTooltip({ data, tokens, normalize }: CompareTooltipProps) {
  if (!data) return null;

  const entries = tokens
    .map((token, index) => {
      const value = data[`rank_${token.id}`];
      return {
        token,
        color: COMPARE_COLORS[index % COMPARE_COLORS.length],
        value: typeof value === 'number' ? value : null,
      };
    })
    .filter((e) => e.value !== null)
    .sort((a, b) => {
      if (normalize) return (a.value as number) - (b.value as number);
      return (a.value as number) - (b.value as number);
    });

  return (
    <div className="absolute top-2 right-5 z-10 pointer-events-none bg-gray-900/80 backdrop-blur-sm border border-gray-600 rounded-lg p-2 shadow-lg text-xs">
      <div className="text-gray-400 mb-1 font-medium">{data.date}</div>
      <div className="space-y-0.5">
        {entries.map(({ token, color, value }) => (
          <div key={token.id} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-gray-400">{token.symbol}</span>
            <span className="text-white font-medium ml-auto">
              {normalize
                ? `${(value as number) > 0 ? '+' : ''}${value}`
                : `#${value}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
