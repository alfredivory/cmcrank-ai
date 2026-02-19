export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import TokenHeader from '@/components/tokens/TokenHeader';
import RankChart from '@/components/charts/RankChart';
import SiteFooter from '@/components/layout/SiteFooter';
import { getTokenDetailBySlug, getSnapshotHistory, getLatestSnapshotDate } from '@/lib/queries/tokens';
import type { SnapshotTimeRange, ChartOverlay } from '@/types/api';

const VALID_RANGES: SnapshotTimeRange[] = ['7d', '30d', '90d', '1y', 'all'];
const VALID_OVERLAYS: ChartOverlay[] = ['rank', 'marketCap', 'price', 'circulatingSupply', 'volume24h'];
const DEFAULT_RANGE: SnapshotTimeRange = '30d';
const DEFAULT_OVERLAY: ChartOverlay = 'rank';

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

  const isCustomRange = rangeParam === 'custom' && startParam && endParam;
  const initialRange: SnapshotTimeRange = isCustomRange
    ? 'all' // getSnapshotHistory uses 'all' with custom dates
    : VALID_RANGES.includes(rangeParam as SnapshotTimeRange)
      ? (rangeParam as SnapshotTimeRange)
      : DEFAULT_RANGE;
  const initialOverlay = VALID_OVERLAYS.includes(overlayParam as ChartOverlay)
    ? (overlayParam as ChartOverlay)
    : DEFAULT_OVERLAY;

  const snapshotPromise = isCustomRange
    ? getSnapshotHistory(token.id, 'all', new Date(startParam), new Date(endParam))
    : getSnapshotHistory(token.id, initialRange);

  const [initialSnapshots, latestSnapshotDate] = await Promise.all([
    snapshotPromise,
    getLatestSnapshotDate(),
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center text-gray-400 hover:text-blue-400 transition-colors mb-6"
        >
          &larr; Back to Token List
        </Link>

        {/* Token Header */}
        <TokenHeader token={token} />

        {/* Rank Chart */}
        <div className="mt-6">
          <RankChart
            tokenId={token.id}
            slug={token.slug}
            initialSnapshots={initialSnapshots}
            initialRange={isCustomRange ? 'custom' : initialRange}
            initialOverlay={initialOverlay}
          />
        </div>

        <SiteFooter latestSnapshotDate={latestSnapshotDate} />
      </div>
    </main>
  );
}
