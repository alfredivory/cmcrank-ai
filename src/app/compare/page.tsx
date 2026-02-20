export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import CompareView from '@/components/compare/CompareView';
import { getTokensBySlugs, getSnapshotHistory, getLatestSnapshotDate } from '@/lib/queries/tokens';
import type { SnapshotTimeRange, SnapshotDataPoint, TokenSearchResult } from '@/types/api';

const VALID_RANGES: SnapshotTimeRange[] = ['7d', '30d', '90d', '1y', 'all'];
const DEFAULT_RANGE: SnapshotTimeRange = '30d';
const MAX_TOKENS = 5;

export const metadata: Metadata = {
  title: 'Compare Tokens — CMCRank.ai',
  description: 'Compare CoinMarketCap rank trends for multiple tokens side by side.',
};

interface ComparePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const resolvedParams = await searchParams;

  const tokensParam = typeof resolvedParams.tokens === 'string' ? resolvedParams.tokens : undefined;
  const rangeParam = typeof resolvedParams.range === 'string' ? resolvedParams.range : undefined;
  const normalizeParam = typeof resolvedParams.normalize === 'string' ? resolvedParams.normalize : undefined;
  const startParam = typeof resolvedParams.start === 'string' ? resolvedParams.start : undefined;
  const endParam = typeof resolvedParams.end === 'string' ? resolvedParams.end : undefined;

  const isCustomRange = rangeParam === 'custom' && startParam && endParam;
  const initialRange: SnapshotTimeRange = isCustomRange
    ? 'all'
    : VALID_RANGES.includes(rangeParam as SnapshotTimeRange)
      ? (rangeParam as SnapshotTimeRange)
      : DEFAULT_RANGE;
  const initialNormalize = normalizeParam === 'true';

  let initialTokens: TokenSearchResult[] = [];
  const initialSnapshots = new Map<string, SnapshotDataPoint[]>();

  if (tokensParam) {
    const slugs = tokensParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, MAX_TOKENS);

    if (slugs.length > 0) {
      initialTokens = await getTokensBySlugs(slugs);

      const snapshotResults = await Promise.all(
        initialTokens.map((token) =>
          isCustomRange
            ? getSnapshotHistory(token.id, 'all', new Date(startParam), new Date(endParam))
            : getSnapshotHistory(token.id, initialRange)
        )
      );

      initialTokens.forEach((token, i) => {
        initialSnapshots.set(token.id, snapshotResults[i]);
      });
    }
  }

  const latestSnapshotDate = await getLatestSnapshotDate();

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <SiteHeader />
        <h2 className="text-xl font-semibold mb-6">Compare Tokens</h2>
        <CompareView
          initialTokens={initialTokens}
          initialSnapshots={initialSnapshots}
          initialRange={isCustomRange ? 'custom' : initialRange}
          initialNormalize={initialNormalize}
        />
        <SiteFooter latestSnapshotDate={latestSnapshotDate} />
      </div>
    </main>
  );
}
