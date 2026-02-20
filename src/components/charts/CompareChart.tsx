'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import CompareTooltip from './CompareTooltip';
import type { TokenSearchResult, CompareDataPoint } from '@/types/api';
import { COMPARE_COLORS, computeUniformTicks } from '@/lib/chart-utils';

interface CompareChartProps {
  data: CompareDataPoint[];
  tokens: TokenSearchResult[];
  hiddenTokenIds: Set<string>;
  normalize: boolean;
}

function TooltipDataBridge({ active, payload, onData }: {
  active?: boolean;
  payload?: Array<{ payload: CompareDataPoint }>;
  onData: (d: CompareDataPoint | null) => void;
}) {
  useEffect(() => {
    onData(active && payload?.[0] ? payload[0].payload : null);
  }, [active, payload, onData]);

  return null;
}

export default function CompareChart({ data, tokens, hiddenTokenIds, normalize }: CompareChartProps) {
  const [hoveredData, setHoveredData] = useState<CompareDataPoint | null>(null);

  const handleData = useCallback((d: CompareDataPoint | null) => {
    setHoveredData(d);
  }, []);

  const visibleTokens = useMemo(
    () => tokens.filter((t) => !hiddenTokenIds.has(t.id)),
    [tokens, hiddenTokenIds]
  );

  const dates = useMemo(() => data.map((d) => d.date as string), [data]);
  const xTicks = useMemo(() => computeUniformTicks(dates), [dates]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <Tooltip
            content={<TooltipDataBridge onData={handleData} />}
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
          <YAxis
            reversed
            stroke="#9ca3af"
            tick={{ fontSize: 12 }}
            tickFormatter={(value: number) =>
              normalize ? `${value > 0 ? '+' : ''}${value}` : `#${value}`
            }
            width={60}
          />
          {visibleTokens.map((token) => {
            const colorIndex = tokens.findIndex((t) => t.id === token.id);
            return (
              <Line
                key={token.id}
                type="monotone"
                dataKey={`rank_${token.id}`}
                stroke={COMPARE_COLORS[colorIndex % COMPARE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
                connectNulls={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
      <CompareTooltip data={hoveredData} tokens={tokens} normalize={normalize} />
    </div>
  );
}
