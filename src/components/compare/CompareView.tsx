'use client';

import { useState, useCallback, useMemo } from 'react';
import TokenSearchInput from './TokenSearchInput';
import SelectedTokenChips from './SelectedTokenChips';
import CompareLegend from './CompareLegend';
import NormalizeToggle from './NormalizeToggle';
import TimeRangeSelector from '@/components/charts/TimeRangeSelector';
import CompareChart from '@/components/charts/CompareChart';
import type {
  TokenSearchResult,
  TokenListItem,
  SnapshotDataPoint,
  SnapshotTimeRange,
  CompareResponse,
  CompareDataPoint,
} from '@/types/api';
import { mergeSnapshotsForCompare, normalizeRankData } from '@/lib/chart-utils';

interface CompareViewProps {
  initialTokens: TokenSearchResult[];
  initialSnapshots: Map<string, SnapshotDataPoint[]>;
  initialRange: SnapshotTimeRange | 'custom';
  initialNormalize: boolean;
}

const MAX_TOKENS = 5;

function updateUrl(params: Record<string, string>, removes?: string[]) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  if (removes) {
    for (const key of removes) {
      url.searchParams.delete(key);
    }
  }
  if (params.range && params.range !== 'custom') {
    url.searchParams.delete('start');
    url.searchParams.delete('end');
  }
  window.history.replaceState({}, '', url.toString());
}

export default function CompareView({
  initialTokens,
  initialSnapshots,
  initialRange,
  initialNormalize,
}: CompareViewProps) {
  const [selectedTokens, setSelectedTokens] = useState<TokenSearchResult[]>(initialTokens);
  const [tokenSnapshots, setTokenSnapshots] = useState<Map<string, SnapshotDataPoint[]>>(initialSnapshots);
  const [range, setRange] = useState<SnapshotTimeRange | 'custom'>(initialRange);
  const [normalize, setNormalize] = useState(initialNormalize);
  const [hiddenTokenIds, setHiddenTokenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const excludeIds = useMemo(
    () => new Set(selectedTokens.map((t) => t.id)),
    [selectedTokens]
  );

  const mergedData = useMemo(() => {
    const tokenIds = selectedTokens.map((t) => t.id);
    const entries = tokenIds
      .filter((id) => tokenSnapshots.has(id))
      .map((id) => ({
        tokenId: id,
        snapshots: tokenSnapshots.get(id)!,
      }));
    return mergeSnapshotsForCompare(entries);
  }, [selectedTokens, tokenSnapshots]);

  const chartData: CompareDataPoint[] = useMemo(() => {
    if (!normalize) return mergedData;
    return normalizeRankData(mergedData, selectedTokens.map((t) => t.id));
  }, [mergedData, normalize, selectedTokens]);

  const addToken = useCallback(async (token: TokenListItem) => {
    if (selectedTokens.length >= MAX_TOKENS) return;

    const searchResult: TokenSearchResult = {
      id: token.id,
      name: token.name,
      symbol: token.symbol,
      slug: token.slug,
      logoUrl: token.logoUrl,
      currentRank: token.currentRank,
    };

    const newTokens = [...selectedTokens, searchResult];
    setSelectedTokens(newTokens);

    // Fetch snapshots for the new token
    setLoading(true);
    try {
      const slugs = newTokens.map((t) => t.slug).join(',');
      const params = new URLSearchParams({ tokens: slugs });
      if (range !== 'custom') {
        params.set('range', range);
      }
      const response = await fetch(`/api/compare?${params.toString()}`);
      if (response.ok) {
        const body: CompareResponse = await response.json();
        const newMap = new Map<string, SnapshotDataPoint[]>();
        for (const td of body.data.tokens) {
          newMap.set(td.token.id, td.snapshots);
        }
        setTokenSnapshots(newMap);
      }
    } finally {
      setLoading(false);
    }

    updateUrl({
      tokens: newTokens.map((t) => t.slug).join(','),
      ...(normalize ? { normalize: 'true' } : {}),
    });
  }, [selectedTokens, range, normalize]);

  const removeToken = useCallback((tokenId: string) => {
    const newTokens = selectedTokens.filter((t) => t.id !== tokenId);
    setSelectedTokens(newTokens);

    const newMap = new Map(tokenSnapshots);
    newMap.delete(tokenId);
    setTokenSnapshots(newMap);

    setHiddenTokenIds((prev) => {
      const next = new Set(prev);
      next.delete(tokenId);
      return next;
    });

    if (newTokens.length === 0) {
      updateUrl({}, ['tokens', 'normalize']);
    } else {
      updateUrl({ tokens: newTokens.map((t) => t.slug).join(',') });
    }
  }, [selectedTokens, tokenSnapshots]);

  const handleRangeChange = useCallback(async (newRange: SnapshotTimeRange) => {
    if (selectedTokens.length === 0) {
      setRange(newRange);
      updateUrl({ range: newRange });
      return;
    }

    setLoading(true);
    setRange(newRange);
    try {
      const slugs = selectedTokens.map((t) => t.slug).join(',');
      const response = await fetch(`/api/compare?tokens=${slugs}&range=${newRange}`);
      if (response.ok) {
        const body: CompareResponse = await response.json();
        const newMap = new Map<string, SnapshotDataPoint[]>();
        for (const td of body.data.tokens) {
          newMap.set(td.token.id, td.snapshots);
        }
        setTokenSnapshots(newMap);
      }
    } finally {
      setLoading(false);
    }

    updateUrl({ range: newRange });
  }, [selectedTokens]);

  const handleCustomRange = useCallback(async (start: string, end: string) => {
    if (selectedTokens.length === 0) {
      setRange('custom');
      updateUrl({ range: 'custom', start, end });
      return;
    }

    setLoading(true);
    setRange('custom');
    try {
      const slugs = selectedTokens.map((t) => t.slug).join(',');
      const response = await fetch(`/api/compare?tokens=${slugs}&start=${start}&end=${end}`);
      if (response.ok) {
        const body: CompareResponse = await response.json();
        const newMap = new Map<string, SnapshotDataPoint[]>();
        for (const td of body.data.tokens) {
          newMap.set(td.token.id, td.snapshots);
        }
        setTokenSnapshots(newMap);
      }
    } finally {
      setLoading(false);
    }

    updateUrl({ range: 'custom', start, end });
  }, [selectedTokens]);

  const toggleNormalize = useCallback(() => {
    setNormalize((prev) => {
      const next = !prev;
      if (next) {
        updateUrl({ normalize: 'true' });
      } else {
        updateUrl({}, ['normalize']);
      }
      return next;
    });
  }, []);

  const toggleVisibility = useCallback((tokenId: string) => {
    setHiddenTokenIds((prev) => {
      const next = new Set(prev);
      if (next.has(tokenId)) {
        next.delete(tokenId);
      } else {
        next.add(tokenId);
      }
      return next;
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <TokenSearchInput
          excludeIds={excludeIds}
          onSelect={addToken}
          disabled={selectedTokens.length >= MAX_TOKENS}
        />
        <NormalizeToggle enabled={normalize} onToggle={toggleNormalize} />
      </div>

      {selectedTokens.length > 0 && (
        <SelectedTokenChips tokens={selectedTokens} onRemove={removeToken} />
      )}

      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <div className="mb-6">
          <TimeRangeSelector
            activeRange={range}
            onRangeChange={handleRangeChange}
            onCustomRange={handleCustomRange}
          />
        </div>

        <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
          {selectedTokens.length === 0 ? (
            <div className="flex items-center justify-center h-80 text-gray-500">
              Search and add tokens above to compare their rank over time
            </div>
          ) : (
            <CompareChart
              data={chartData}
              tokens={selectedTokens}
              hiddenTokenIds={hiddenTokenIds}
              normalize={normalize}
            />
          )}
        </div>

        {selectedTokens.length > 0 && (
          <div className="mt-4">
            <CompareLegend
              tokens={selectedTokens}
              hiddenTokenIds={hiddenTokenIds}
              onToggleVisibility={toggleVisibility}
            />
          </div>
        )}
      </div>
    </div>
  );
}
