'use client';

import { formatPrice, formatLargeNumber } from '@/lib/format';
import { COMPARE_COLORS } from '@/lib/chart-utils';
import type { SnapshotDataPoint, CompareDataPoint, ChartOverlay, TokenSearchResult } from '@/types/api';

interface ChartTooltipProps {
  data: SnapshotDataPoint | null;
  compareData?: CompareDataPoint | null;
  compareTokens?: TokenSearchResult[];
  metric?: ChartOverlay;
  mainTokenId?: string;
}

function formatNormalizedValue(value: number | null | string | undefined, metric: ChartOverlay): string {
  if (value == null || typeof value === 'string') return '—';
  const num = value as number;
  if (metric === 'rank') {
    if (num > 0) return `+${num}`;
    if (num < 0) return String(num);
    return '0';
  }
  return `${num.toFixed(1)}%`;
}

export default function ChartTooltip({ data, compareData, compareTokens, metric, mainTokenId }: ChartTooltipProps) {
  const isCompareMode = !!compareData && !!compareTokens && compareTokens.length > 0;

  if (!data && !isCompareMode) {
    return null;
  }

  return (
    <div className="absolute top-2 right-5 z-10 pointer-events-none bg-gray-900/80 backdrop-blur-sm border border-gray-600 rounded-lg p-2 shadow-lg text-xs">
      <div className="text-gray-400 mb-1 font-medium">
        {isCompareMode ? compareData?.date : data?.date}
      </div>

      {/* Main token stats — always shown when data is available */}
      {data && (
        <div className="space-y-0.5">
          <div className="flex justify-between gap-3">
            <span className="text-gray-400">Rank</span>
            <span className="text-white font-medium">#{data.rank}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-gray-400">Price</span>
            <span className="text-white">{formatPrice(data.price)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-gray-400">Market Cap</span>
            <span className="text-white">{formatLargeNumber(data.marketCap)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-gray-400">Volume 24h</span>
            <span className="text-white">{formatLargeNumber(data.volume24h)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-gray-400">Supply</span>
            <span className="text-white">{data.circulatingSupply.toLocaleString('en-US')}</span>
          </div>
        </div>
      )}

      {/* Compare mode: show normalized values for all tokens */}
      {isCompareMode && compareData && metric && mainTokenId && (
        <div className="mt-1.5 pt-1.5 border-t border-gray-600 space-y-0.5">
          {compareTokens!.map((token, index) => {
            const key = `${metric}_${token.id}`;
            const val = compareData[key];
            const isMain = token.id === mainTokenId;
            return (
              <div key={token.id} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COMPARE_COLORS[index] }}
                />
                <span className={`text-gray-400 ${isMain ? 'font-medium' : ''}`}>
                  {token.symbol}
                </span>
                <span className="text-white ml-auto">
                  {formatNormalizedValue(val, metric)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
