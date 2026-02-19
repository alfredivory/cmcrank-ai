'use client';

import { formatPrice, formatLargeNumber } from '@/lib/format';

interface ChartTooltipPayloadItem {
  payload: {
    date: string;
    rank: number;
    marketCap: number;
    price: number;
    volume24h: number;
    circulatingSupply: number;
  };
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
}

export default function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg text-sm">
      <div className="text-gray-400 mb-2 font-medium">{data.date}</div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Rank</span>
          <span className="text-white font-medium">#{data.rank}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Price</span>
          <span className="text-white">{formatPrice(data.price)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Market Cap</span>
          <span className="text-white">{formatLargeNumber(data.marketCap)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Volume 24h</span>
          <span className="text-white">{formatLargeNumber(data.volume24h)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Supply</span>
          <span className="text-white">{data.circulatingSupply.toLocaleString('en-US')}</span>
        </div>
      </div>
    </div>
  );
}
