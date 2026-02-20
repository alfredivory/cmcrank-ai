'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type {
  SnapshotDataPoint,
  SnapshotTimeRange,
  ChartOverlay,
  TokenSearchResult,
  TokenListItem,
  CompareDataPoint,
} from '@/types/api';
import { mergeSnapshotsForMetric, normalizeMetricData, COMPARE_COLORS } from '@/lib/chart-utils';

interface UseCompareModeParams {
  mainToken: TokenSearchResult;
  slug: string;
  mainSnapshots: SnapshotDataPoint[];
  range: SnapshotTimeRange | 'custom';
  activeOverlay: ChartOverlay;
  initialCompareTokens?: TokenSearchResult[];
  initialCompareSnapshots?: [string, SnapshotDataPoint[]][];
}

interface UseCompareModeReturn {
  isCompareMode: boolean;
  compareTokens: TokenSearchResult[];
  allTokens: TokenSearchResult[];
  hiddenTokenIds: Set<string>;
  compareChartData: CompareDataPoint[];
  addCompareToken: (token: TokenListItem) => void;
  removeCompareToken: (tokenId: string) => void;
  toggleVisibility: (tokenId: string) => void;
  getTokenColor: (tokenId: string) => string;
  compareTokenNames: string[];
  refreshCompareData: (newRange: SnapshotTimeRange | 'custom', customStart?: string, customEnd?: string) => Promise<SnapshotDataPoint[] | null>;
}

export function useCompareMode({
  mainToken,
  slug,
  mainSnapshots,
  range,
  activeOverlay,
  initialCompareTokens = [],
  initialCompareSnapshots = [],
}: UseCompareModeParams): UseCompareModeReturn {
  const [compareTokens, setCompareTokens] = useState<TokenSearchResult[]>(initialCompareTokens);
  const [compareSnapshots, setCompareSnapshots] = useState<Map<string, SnapshotDataPoint[]>>(
    () => new Map(initialCompareSnapshots)
  );
  const [hiddenTokenIds, setHiddenTokenIds] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const isCompareMode = compareTokens.length > 0;

  const allTokens = useMemo(
    () => [mainToken, ...compareTokens],
    [mainToken, compareTokens]
  );

  // Stable color mapping: main token = index 0, compare tokens in add order
  const getTokenColor = useCallback((tokenId: string): string => {
    if (tokenId === mainToken.id) return COMPARE_COLORS[0];
    const idx = compareTokens.findIndex(t => t.id === tokenId);
    if (idx === -1) return COMPARE_COLORS[0];
    return COMPARE_COLORS[(idx + 1) % COMPARE_COLORS.length];
  }, [mainToken.id, compareTokens]);

  // Compute merged + normalized chart data for compare mode
  const compareChartData = useMemo(() => {
    if (!isCompareMode) return [];

    const allTokenSnapshots = [
      { tokenId: mainToken.id, snapshots: mainSnapshots },
      ...compareTokens.map(t => ({
        tokenId: t.id,
        snapshots: compareSnapshots.get(t.id) ?? [],
      })),
    ];

    const merged = mergeSnapshotsForMetric(allTokenSnapshots, activeOverlay);
    const tokenIds = allTokens.map(t => t.id);
    return normalizeMetricData(merged, tokenIds, activeOverlay);
  }, [isCompareMode, mainToken.id, mainSnapshots, compareTokens, compareSnapshots, activeOverlay, allTokens]);

  const compareTokenNames = useMemo(
    () => compareTokens.map(t => t.name),
    [compareTokens]
  );

  // Fetch compare data from API
  const fetchCompareData = useCallback(async (
    slugs: string[],
    fetchRange: SnapshotTimeRange | 'custom',
    customStart?: string,
    customEnd?: string,
  ): Promise<{ tokens: { token: TokenSearchResult; snapshots: SnapshotDataPoint[] }[] } | null> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let url = `/api/compare?tokens=${slugs.join(',')}`;
    if (fetchRange === 'custom' && customStart && customEnd) {
      url += `&start=${customStart}&end=${customEnd}`;
    } else {
      url += `&range=${fetchRange}`;
    }

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) return null;
      const body = await response.json();
      return body.data;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return null;
      throw err;
    }
  }, []);

  const updateCompareUrl = useCallback((tokens: TokenSearchResult[]) => {
    const url = new URL(window.location.href);
    if (tokens.length > 0) {
      url.searchParams.set('compare', tokens.map(t => t.slug).join(','));
    } else {
      url.searchParams.delete('compare');
    }
    window.history.replaceState({}, '', url.toString());
  }, []);

  const addCompareToken = useCallback(async (token: TokenListItem) => {
    if (compareTokens.length >= 4) return;
    if (compareTokens.some(t => t.id === token.id)) return;

    const newToken: TokenSearchResult = {
      id: token.id,
      name: token.name,
      symbol: token.symbol,
      slug: token.slug,
      logoUrl: token.logoUrl,
      currentRank: token.currentRank,
    };

    const newTokens = [...compareTokens, newToken];
    setCompareTokens(newTokens);
    updateCompareUrl(newTokens);

    // Fetch data for all tokens (including main) to get aligned dates
    const allSlugs = [slug, ...newTokens.map(t => t.slug)];
    const url = new URL(window.location.href);
    const start = url.searchParams.get('start') ?? undefined;
    const end = url.searchParams.get('end') ?? undefined;
    const data = await fetchCompareData(allSlugs, range, start, end);

    if (data) {
      const newSnapMap = new Map<string, SnapshotDataPoint[]>();
      for (const entry of data.tokens) {
        if (entry.token.id !== mainToken.id) {
          newSnapMap.set(entry.token.id, entry.snapshots);
        }
      }
      setCompareSnapshots(newSnapMap);
    }
  }, [compareTokens, slug, range, mainToken.id, fetchCompareData, updateCompareUrl]);

  const removeCompareToken = useCallback((tokenId: string) => {
    const newTokens = compareTokens.filter(t => t.id !== tokenId);
    setCompareTokens(newTokens);
    updateCompareUrl(newTokens);

    setCompareSnapshots(prev => {
      const next = new Map(prev);
      next.delete(tokenId);
      return next;
    });

    setHiddenTokenIds(prev => {
      const next = new Set(prev);
      next.delete(tokenId);
      return next;
    });
  }, [compareTokens, updateCompareUrl]);

  const toggleVisibility = useCallback((tokenId: string) => {
    setHiddenTokenIds(prev => {
      const next = new Set(prev);
      if (next.has(tokenId)) {
        next.delete(tokenId);
      } else {
        next.add(tokenId);
      }
      return next;
    });
  }, []);

  // Refresh all compare token data when range changes
  const refreshCompareData = useCallback(async (
    newRange: SnapshotTimeRange | 'custom',
    customStart?: string,
    customEnd?: string,
  ): Promise<SnapshotDataPoint[] | null> => {
    if (compareTokens.length === 0) return null;

    const allSlugs = [slug, ...compareTokens.map(t => t.slug)];
    const data = await fetchCompareData(allSlugs, newRange, customStart, customEnd);

    if (data) {
      const newSnapMap = new Map<string, SnapshotDataPoint[]>();
      let mainSnaps: SnapshotDataPoint[] | null = null;

      for (const entry of data.tokens) {
        if (entry.token.id === mainToken.id) {
          mainSnaps = entry.snapshots;
        } else {
          newSnapMap.set(entry.token.id, entry.snapshots);
        }
      }

      setCompareSnapshots(newSnapMap);
      return mainSnaps;
    }
    return null;
  }, [compareTokens, slug, mainToken.id, fetchCompareData]);

  return {
    isCompareMode,
    compareTokens,
    allTokens,
    hiddenTokenIds,
    compareChartData,
    addCompareToken,
    removeCompareToken,
    toggleVisibility,
    getTokenColor,
    compareTokenNames,
    refreshCompareData,
  };
}
