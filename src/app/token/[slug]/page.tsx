export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import TokenHeader from '@/components/tokens/TokenHeader';
import TokenResearchSection from '@/components/research/TokenResearchSection';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import { getTokenDetailBySlug, getSnapshotHistory, getLatestSnapshotDate, getTokensBySlugs } from '@/lib/queries/tokens';
import { getResearchForToken } from '@/lib/queries/research';
import type { SnapshotTimeRange, ChartOverlay, TokenSearchResult, SnapshotDataPoint } from '@/types/api';

const VALID_RANGES: SnapshotTimeRange[] = ['7d', '30d', '90d', '1y', 'all'];
const VALID_OVERLAYS: ChartOverlay[] = ['rank', 'marketCap', 'price', 'circulatingSupply', 'volume24h'];
const DEFAULT_RANGE: SnapshotTimeRange = '30d';
const DEFAULT_OVERLAY: ChartOverlay = 'rank';
const MAX_COMPARE_TOKENS = 4;

interface TokenPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: TokenPageProps): Promise<Metadata> {
  const { slug } = await params;
  const token = await getTokenDetailBySlug(slug);

  if (!token) {
    return { title: 'Token Not Found — CMCRank.ai' };
  }

  return {
    title: `${token.name} (${token.symbol}) Rank Chart — CMCRank.ai`,
    description: `Track ${token.name} (${token.symbol}) CoinMarketCap rank over time. Currently ranked #${token.currentRank}.`,
  };
}

export default async function TokenPage({ params, searchParams }: TokenPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const token = await getTokenDetailBySlug(slug);

  if (!token) {
    notFound();
  }

  const rangeParam = typeof resolvedSearchParams.range === 'string' ? resolvedSearchParams.range : undefined;
  const overlayParam = typeof resolvedSearchParams.overlay === 'string' ? resolvedSearchParams.overlay : undefined;
  const startParam = typeof resolvedSearchParams.start === 'string' ? resolvedSearchParams.start : undefined;
  const endParam = typeof resolvedSearchParams.end === 'string' ? resolvedSearchParams.end : undefined;
  const compareParam = typeof resolvedSearchParams.compare === 'string' ? resolvedSearchParams.compare : undefined;

  const isCustomRange = rangeParam === 'custom' && startParam && endParam;
  const initialRange: SnapshotTimeRange = isCustomRange
    ? 'all' // getSnapshotHistory uses 'all' with custom dates
    : VALID_RANGES.includes(rangeParam as SnapshotTimeRange)
      ? (rangeParam as SnapshotTimeRange)
      : DEFAULT_RANGE;
  const initialOverlay = VALID_OVERLAYS.includes(overlayParam as ChartOverlay)
    ? (overlayParam as ChartOverlay)
    : DEFAULT_OVERLAY;

  // Parse compare slugs (max 4, filter out main token slug and empty strings)
  const compareSlugs = compareParam
    ? compareParam.split(',').filter(s => s.trim() && s.trim() !== slug).slice(0, MAX_COMPARE_TOKENS)
    : [];

  const snapshotPromise = isCustomRange
    ? getSnapshotHistory(token.id, 'all', new Date(startParam), new Date(endParam))
    : getSnapshotHistory(token.id, initialRange);

  // Fetch compare tokens in parallel if requested
  const compareTokensPromise = compareSlugs.length > 0
    ? getTokensBySlugs(compareSlugs)
    : Promise.resolve([]);

  const [initialSnapshots, latestSnapshotDate, researchResult, compareTokenDetails] = await Promise.all([
    snapshotPromise,
    getLatestSnapshotDate(),
    getResearchForToken(token.id, { limit: 10, offset: 0 }),
    compareTokensPromise,
  ]);

  // Fetch comparison token snapshots in parallel
  let initialCompareTokens: TokenSearchResult[] | undefined;
  let initialCompareSnapshots: [string, SnapshotDataPoint[]][] | undefined;

  if (compareTokenDetails.length > 0) {
    const snapshotFetches = compareTokenDetails.map(ct =>
      isCustomRange
        ? getSnapshotHistory(ct.id, 'all', new Date(startParam!), new Date(endParam!))
        : getSnapshotHistory(ct.id, initialRange)
    );
    const compareSnaps = await Promise.all(snapshotFetches);

    initialCompareTokens = compareTokenDetails;
    initialCompareSnapshots = compareTokenDetails.map((ct, i) => [ct.id, compareSnaps[i]]);
  }

  const researchPeriods = researchResult.items
    .filter(item => item.status === 'COMPLETE')
    .map((item) => ({
      id: item.id,
      title: item.title,
      dateRangeStart: item.dateRangeStart.toISOString().split('T')[0],
      dateRangeEnd: item.dateRangeEnd.toISOString().split('T')[0],
      importanceScore: item.importanceScore,
    }));

  // Build mainToken from token detail
  const mainToken: TokenSearchResult = {
    id: token.id,
    name: token.name,
    symbol: token.symbol,
    slug: token.slug,
    logoUrl: token.logoUrl,
    currentRank: token.currentRank,
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <SiteHeader />

        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center text-gray-400 hover:text-blue-400 transition-colors mb-6"
        >
          &larr; Back to Token List
        </Link>

        {/* Token Header */}
        <TokenHeader token={token} />

        {/* Chart + Research Section */}
        <TokenResearchSection
          tokenId={token.id}
          slug={token.slug}
          tokenName={token.name}
          initialSnapshots={initialSnapshots}
          initialRange={isCustomRange ? 'custom' : initialRange}
          initialOverlay={initialOverlay}
          researchPeriods={researchPeriods}
          mainToken={mainToken}
          initialCompareTokens={initialCompareTokens}
          initialCompareSnapshots={initialCompareSnapshots}
        />

        <SiteFooter latestSnapshotDate={latestSnapshotDate} />
      </div>
    </main>
  );
}
