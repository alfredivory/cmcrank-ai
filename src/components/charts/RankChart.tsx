'use client';

import { useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import TimeRangeSelector from './TimeRangeSelector';
import OverlaySelector from './OverlaySelector';
import ChartTooltip from './ChartTooltip';
import type { SnapshotDataPoint, SnapshotTimeRange, ChartOverlay } from '@/types/api';
import { formatLargeNumber } from '@/lib/format';

interface RankChartProps {
  tokenId: string;
  slug: string;
  initialSnapshots: SnapshotDataPoint[];
  initialRange: SnapshotTimeRange;
}

const OVERLAY_COLORS: Record<ChartOverlay, string> = {
  rank: '#3b82f6',
  marketCap: '#10b981',
  price: '#f59e0b',
  volume24h: '#8b5cf6',
  circulatingSupply: '#ec4899',
};

function formatYAxis(value: number, overlay: ChartOverlay): string {
  if (overlay === 'rank') return `#${value}`;
  if (overlay === 'circulatingSupply') return value.toLocaleString('en-US', { notation: 'compact' });
  return formatLargeNumber(value);
}

export default function RankChart({
  tokenId,
  slug,
  initialSnapshots,
  initialRange,
}: RankChartProps) {
  const [snapshots, setSnapshots] = useState<SnapshotDataPoint[]>(initialSnapshots);
  const [range, setRange] = useState<SnapshotTimeRange | 'custom'>(initialRange);
  const [activeOverlay, setActiveOverlay] = useState<ChartOverlay>('rank');
  const [loading, setLoading] = useState(false);

  const fetchSnapshots = useCallback(async (url: string, newRange: SnapshotTimeRange | 'custom') => {
    setLoading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) return;
      const body = await response.json();
      setSnapshots(body.data.snapshots);
      setRange(newRange);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRangeChange = useCallback((newRange: SnapshotTimeRange) => {
    fetchSnapshots(`/api/tokens/${slug}/snapshots?range=${newRange}`, newRange);
  }, [slug, fetchSnapshots]);

  const handleCustomRange = useCallback((start: string, end: string) => {
    fetchSnapshots(`/api/tokens/${slug}/snapshots?start=${start}&end=${end}`, 'custom');
  }, [slug, fetchSnapshots]);

  const handleOverlayChange = useCallback((overlay: ChartOverlay) => {
    setActiveOverlay(overlay);
  }, []);

  // Suppress unused variable warning — tokenId reserved for future event markers
  void tokenId;

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <TimeRangeSelector
          activeRange={range}
          onRangeChange={handleRangeChange}
          onCustomRange={handleCustomRange}
        />
        <OverlaySelector
          activeOverlay={activeOverlay}
          onOverlayChange={handleOverlayChange}
        />
      </div>

      <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
        {snapshots.length === 0 ? (
          <div className="flex items-center justify-center h-80 text-gray-500">
            No data available for this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={snapshots} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                tickFormatter={(value: string) => {
                  const parts = value.split('-');
                  return `${parts[1]}/${parts[2]}`;
                }}
              />
              <YAxis
                reversed={activeOverlay === 'rank'}
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                tickFormatter={(value: number) => formatYAxis(value, activeOverlay)}
                width={80}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey={activeOverlay}
                stroke={OVERLAY_COLORS[activeOverlay]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
