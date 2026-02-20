'use client';

import { formatPrice, formatLargeNumber } from '@/lib/format';
import type { SnapshotDataPoint } from '@/types/api';

interface ChartTooltipProps {
  data: SnapshotDataPoint | null;
}

export default function ChartTooltip({ data }: ChartTooltipProps) {
  if (!data) {
    return null;
  }

  return (
    <div className="absolute top-2 left-2 z-10 pointer-events-none bg-gray-900/80 backdrop-blur-sm border border-gray-600 rounded-lg p-2 shadow-lg text-xs">
      <div className="text-gray-400 mb-1 font-medium">{data.date}</div>
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
    </div>
  );
}
