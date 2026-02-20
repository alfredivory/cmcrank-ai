'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import TimeRangeSelector from './TimeRangeSelector';
import OverlaySelector from './OverlaySelector';
import ChartTooltip from './ChartTooltip';
import ResearchBandTooltip from './ResearchBandTooltip';
import CompareLegend from './CompareLegend';
import CompareDropdown from '@/components/compare/CompareDropdown';
import type { ResearchPeriod } from './ResearchBandTooltip';
import type { SnapshotDataPoint, SnapshotTimeRange, ChartOverlay, TokenSearchResult, CompareDataPoint } from '@/types/api';
import { formatLargeNumber } from '@/lib/format';
import { computeUniformTicks, computeRankMovement, MOVEMENT_COLORS } from '@/lib/chart-utils';
import type { RankMovement } from '@/lib/chart-utils';
import { useCompareMode } from '@/hooks/useCompareMode';

interface RankChartProps {
  tokenId: string;
  slug: string;
  initialSnapshots: SnapshotDataPoint[];
  initialRange: SnapshotTimeRange | 'custom';
  initialOverlay?: ChartOverlay;
  onRangeSelect?: (start: string, end: string) => void;
  researchPeriods?: ResearchPeriod[];
  mainToken: TokenSearchResult;
  initialCompareTokens?: TokenSearchResult[];
  initialCompareSnapshots?: [string, SnapshotDataPoint[]][];
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

function formatCompareYAxis(value: number, metric: ChartOverlay): string {
  if (metric === 'rank') {
    if (value > 0) return `+${value}`;
    if (value < 0) return String(value);
    return '0';
  }
  return `${value.toFixed(0)}%`;
}

/** Invisible component used as recharts Tooltip content to bridge active data to parent state. */
function TooltipDataBridge({ active, payload, onData }: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Array<{ payload: any }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onData: (d: any) => void;
}) {
  useEffect(() => {
    onData(active && payload?.[0] ? payload[0].payload : null);
  }, [active, payload, onData]);

  return null;
}

function updateUrl(params: Record<string, string>, removes?: string[]) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  if (params.range && params.range !== 'custom') {
    url.searchParams.delete('start');
    url.searchParams.delete('end');
  }
  if (removes) {
    for (const key of removes) {
      url.searchParams.delete(key);
    }
  }
  window.history.replaceState({}, '', url.toString());
}

export default function RankChart({
  tokenId,
  slug,
  initialSnapshots,
  initialRange,
  initialOverlay = 'rank',
  onRangeSelect,
  researchPeriods,
  mainToken,
  initialCompareTokens,
  initialCompareSnapshots,
}: RankChartProps) {
  const router = useRouter();
  const [snapshots, setSnapshots] = useState<SnapshotDataPoint[]>(initialSnapshots);
  const [range, setRange] = useState<SnapshotTimeRange | 'custom'>(initialRange);
  const [activeOverlay, setActiveOverlay] = useState<ChartOverlay>(initialOverlay);
  const [loading, setLoading] = useState(false);
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [hoveredData, setHoveredData] = useState<SnapshotDataPoint | null>(null);
  const [hoveredCompareData, setHoveredCompareData] = useState<CompareDataPoint | null>(null);
  const [hoveredResearch, setHoveredResearch] = useState<(ResearchPeriod & { movement: RankMovement }) | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const compare = useCompareMode({
    mainToken,
    slug,
    mainSnapshots: snapshots,
    range,
    activeOverlay,
    initialCompareTokens,
    initialCompareSnapshots,
  });

  const snapshotDates = useMemo(() => {
    if (compare.isCompareMode) {
      return compare.compareChartData.map(d => d.date as string);
    }
    return snapshots.map(s => s.date);
  }, [compare.isCompareMode, compare.compareChartData, snapshots]);

  const visibleResearchBands = useMemo(() => {
    if (!researchPeriods || snapshotDates.length === 0) return [];
    const first = snapshotDates[0];
    const last = snapshotDates[snapshotDates.length - 1];
    const rankSnapshots = snapshots.map(s => ({ date: s.date, rank: s.rank }));
    return researchPeriods
      .filter(p => p.dateRangeStart <= last && p.dateRangeEnd >= first)
      .map(p => ({
        ...p,
        x1: snapshotDates.find(d => d >= p.dateRangeStart) ?? first,
        x2: [...snapshotDates].reverse().find(d => d <= p.dateRangeEnd) ?? last,
        movement: computeRankMovement(rankSnapshots, p.dateRangeStart, p.dateRangeEnd),
      }));
  }, [researchPeriods, snapshotDates, snapshots]);

  // Build a date → SnapshotDataPoint lookup for the main token
  const mainSnapshotsByDate = useMemo(() => {
    const map = new Map<string, SnapshotDataPoint>();
    for (const s of snapshots) {
      map.set(s.date, s);
    }
    return map;
  }, [snapshots]);

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

  const handleRangeChange = useCallback(async (newRange: SnapshotTimeRange) => {
    setLoading(true);
    try {
      if (compare.isCompareMode) {
        // Fetch all tokens at once via compare API
        const mainSnaps = await compare.refreshCompareData(newRange);
        if (mainSnaps) {
          setSnapshots(mainSnaps);
        } else {
          // Fallback: fetch main token separately
          const response = await fetch(`/api/tokens/${slug}/snapshots?range=${newRange}`);
          if (response.ok) {
            const body = await response.json();
            setSnapshots(body.data.snapshots);
          }
        }
        setRange(newRange);
      } else {
        await fetchSnapshots(`/api/tokens/${slug}/snapshots?range=${newRange}`, newRange);
      }
      updateUrl({ range: newRange, overlay: activeOverlay });
    } finally {
      setLoading(false);
    }
  }, [slug, fetchSnapshots, activeOverlay, compare]);

  const handleCustomRange = useCallback(async (start: string, end: string) => {
    setLoading(true);
    try {
      if (compare.isCompareMode) {
        const mainSnaps = await compare.refreshCompareData('custom', start, end);
        if (mainSnaps) {
          setSnapshots(mainSnaps);
        } else {
          const response = await fetch(`/api/tokens/${slug}/snapshots?start=${start}&end=${end}`);
          if (response.ok) {
            const body = await response.json();
            setSnapshots(body.data.snapshots);
          }
        }
        setRange('custom');
      } else {
        await fetchSnapshots(`/api/tokens/${slug}/snapshots?start=${start}&end=${end}`, 'custom');
      }
      updateUrl({ range: 'custom', start, end, overlay: activeOverlay });
    } finally {
      setLoading(false);
    }
  }, [slug, fetchSnapshots, activeOverlay, compare]);

  const handleOverlayChange = useCallback((overlay: ChartOverlay) => {
    setActiveOverlay(overlay);
    updateUrl({ range: range === 'custom' ? 'custom' : range, overlay });
  }, [range]);

  // Tooltip bridge handler: in compare mode we get CompareDataPoint, otherwise SnapshotDataPoint
  const handleTooltipData = useCallback((d: SnapshotDataPoint | CompareDataPoint | null) => {
    if (compare.isCompareMode) {
      setHoveredCompareData(d as CompareDataPoint | null);
      // Look up raw main token data for the hovered date
      if (d && d.date) {
        setHoveredData(mainSnapshotsByDate.get(d.date as string) ?? null);
      } else {
        setHoveredData(null);
      }
    } else {
      setHoveredData(d as SnapshotDataPoint | null);
      setHoveredCompareData(null);
    }
  }, [compare.isCompareMode, mainSnapshotsByDate]);

  const handleMouseDown = useCallback((e: { activeLabel?: string | number }) => {
    if (e?.activeLabel != null) {
      setSelectionStart(String(e.activeLabel));
      setSelectionEnd(null);
      setIsSelecting(true);
    }
  }, []);

  const handleMouseMove = useCallback((e: { activeLabel?: string | number; activeCoordinate?: { x: number; y: number } }) => {
    if (isSelecting && e?.activeLabel != null) {
      setSelectionEnd(String(e.activeLabel));
    }
    if (!isSelecting && e?.activeLabel != null && visibleResearchBands.length > 0) {
      const label = String(e.activeLabel);
      const match = visibleResearchBands.find(p => label >= p.dateRangeStart && label <= p.dateRangeEnd);
      setHoveredResearch(match ?? null);
      if (match && e.activeCoordinate) {
        setTooltipPos({ x: e.activeCoordinate.x, y: e.activeCoordinate.y - 10 });
      }
    } else if (!isSelecting) {
      setHoveredResearch(null);
    }
  }, [isSelecting, visibleResearchBands]);

  const handleMouseUp = useCallback(() => {
    if (isSelecting && selectionStart) {
      if (selectionEnd) {
        const [start, end] = selectionStart < selectionEnd
          ? [selectionStart, selectionEnd]
          : [selectionEnd, selectionStart];
        if (start !== end) {
          onRangeSelect?.(start, end);
        }
      } else if (visibleResearchBands.length > 0) {
        const match = visibleResearchBands.find(
          p => selectionStart >= p.dateRangeStart && selectionStart <= p.dateRangeEnd
        );
        if (match) router.push(`/research/${match.id}`);
      }
    }
    setIsSelecting(false);
  }, [isSelecting, selectionStart, selectionEnd, onRangeSelect, visibleResearchBands, router]);

  const handleMouseLeave = useCallback(() => {
    setHoveredResearch(null);
  }, []);

  const xTicks = useMemo(
    () => computeUniformTicks(snapshotDates),
    [snapshotDates]
  );

  // Suppress unused variable warning — tokenId reserved for future event markers
  void tokenId;

  const chartCursor = hoveredResearch ? 'pointer' : onRangeSelect ? 'crosshair' : undefined;

  // Determine chart data and line rendering based on mode
  const chartData = compare.isCompareMode ? compare.compareChartData : snapshots;
  const hasData = compare.isCompareMode ? compare.compareChartData.length > 0 : snapshots.length > 0;

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <TimeRangeSelector
          activeRange={range}
          onRangeChange={handleRangeChange}
          onCustomRange={handleCustomRange}
        />
        <div className="flex items-center gap-2">
          <CompareDropdown
            mainTokenId={mainToken.id}
            compareTokens={compare.compareTokens}
            onAddToken={compare.addCompareToken}
            onRemoveToken={compare.removeCompareToken}
          />
          <OverlaySelector
            activeOverlay={activeOverlay}
            onOverlayChange={handleOverlayChange}
          />
        </div>
      </div>

      <div className={`relative transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
        {!hasData ? (
          <div className="flex items-center justify-center h-80 text-gray-500">
            No data available for this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: chartCursor }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <Tooltip
                content={<TooltipDataBridge onData={handleTooltipData} />}
                isAnimationActive={false}
                cursor={{ stroke: '#6b7280', strokeDasharray: '3 3' }}
                wrapperStyle={{ visibility: 'hidden' }}
              />
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

              {compare.isCompareMode ? (
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value: number) => formatCompareYAxis(value, activeOverlay)}
                  width={80}
                />
              ) : (
                <YAxis
                  reversed={activeOverlay === 'rank'}
                  stroke="#9ca3af"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value: number) => formatYAxis(value, activeOverlay)}
                  width={80}
                />
              )}

              {/* Research bands — always visible for main token */}
              {visibleResearchBands.map((band) => {
                const colors = MOVEMENT_COLORS[band.movement];
                return (
                  <ReferenceArea
                    key={band.id}
                    x1={band.x1}
                    x2={band.x2}
                    fill={colors.fill}
                    fillOpacity={0.08}
                    stroke={colors.stroke}
                    strokeOpacity={0.2}
                  />
                );
              })}

              {/* Chart lines */}
              {compare.isCompareMode ? (
                // Multiple lines — one per visible token
                compare.allTokens
                  .filter(t => !compare.hiddenTokenIds.has(t.id))
                  .map((token) => (
                    <Line
                      key={token.id}
                      type="monotone"
                      dataKey={`${activeOverlay}_${token.id}`}
                      stroke={compare.getTokenColor(token.id)}
                      strokeWidth={token.id === mainToken.id ? 2.5 : 2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2 }}
                      connectNulls={false}
                    />
                  ))
              ) : (
                // Single line — original behavior
                <Line
                  type="monotone"
                  dataKey={activeOverlay}
                  stroke={OVERLAY_COLORS[activeOverlay]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2 }}
                />
              )}

              {/* Selection highlight */}
              {selectionStart && selectionEnd && (
                <ReferenceArea
                  x1={selectionStart < selectionEnd ? selectionStart : selectionEnd}
                  x2={selectionStart < selectionEnd ? selectionEnd : selectionStart}
                  strokeOpacity={0.3}
                  fill="#3b82f6"
                  fillOpacity={0.2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}

        <ChartTooltip
          data={hoveredData}
          compareData={compare.isCompareMode ? hoveredCompareData : undefined}
          compareTokens={compare.isCompareMode ? compare.allTokens : undefined}
          metric={compare.isCompareMode ? activeOverlay : undefined}
          mainTokenId={compare.isCompareMode ? mainToken.id : undefined}
        />
        {hoveredResearch && (
          <ResearchBandTooltip research={hoveredResearch} x={tooltipPos.x} y={tooltipPos.y} movement={hoveredResearch.movement} />
        )}
      </div>

      {/* Compare legend — shown below chart when in compare mode */}
      {compare.isCompareMode && (
        <CompareLegend
          mainToken={mainToken}
          compareTokens={compare.compareTokens}
          hiddenTokenIds={compare.hiddenTokenIds}
          onToggleVisibility={compare.toggleVisibility}
          onRemoveToken={compare.removeCompareToken}
        />
      )}
    </div>
  );
}
