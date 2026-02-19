'use client';

import { useState, useCallback, useMemo } from 'react';
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
import { computeUniformTicks } from '@/lib/chart-utils';

interface RankChartProps {
  tokenId: string;
  slug: string;
  initialSnapshots: SnapshotDataPoint[];
  initialRange: SnapshotTimeRange | 'custom';
  initialOverlay?: ChartOverlay;
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

function updateUrl(params: Record<string, string>) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  // Remove custom date params when switching to a preset range
  if (params.range && params.range !== 'custom') {
    url.searchParams.delete('start');
    url.searchParams.delete('end');
  }
  window.history.replaceState({}, '', url.toString());
}

export default function RankChart({
  tokenId,
  slug,
  initialSnapshots,
  initialRange,
  initialOverlay = 'rank',
}: RankChartProps) {
  const [snapshots, setSnapshots] = useState<SnapshotDataPoint[]>(initialSnapshots);
  const [range, setRange] = useState<SnapshotTimeRange | 'custom'>(initialRange);
  const [activeOverlay, setActiveOverlay] = useState<ChartOverlay>(initialOverlay);
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
    updateUrl({ range: newRange, overlay: activeOverlay });
  }, [slug, fetchSnapshots, activeOverlay]);

  const handleCustomRange = useCallback((start: string, end: string) => {
    fetchSnapshots(`/api/tokens/${slug}/snapshots?start=${start}&end=${end}`, 'custom');
    updateUrl({ range: 'custom', start, end, overlay: activeOverlay });
  }, [slug, fetchSnapshots, activeOverlay]);

  const handleOverlayChange = useCallback((overlay: ChartOverlay) => {
    setActiveOverlay(overlay);
    updateUrl({ range: range === 'custom' ? 'custom' : range, overlay });
  }, [range]);

  const xTicks = useMemo(
    () => computeUniformTicks(snapshots.map((s) => s.date)),
    [snapshots]
  );

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
                ticks={xTicks}
                interval={0}
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
