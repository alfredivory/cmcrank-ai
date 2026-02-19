export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import TokenHeader from '@/components/tokens/TokenHeader';
import RankChart from '@/components/charts/RankChart';
import { getTokenDetailBySlug, getSnapshotHistory } from '@/lib/queries/tokens';

interface TokenPageProps {
  params: Promise<{ slug: string }>;
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

export default async function TokenPage({ params }: TokenPageProps) {
  const { slug } = await params;
  const token = await getTokenDetailBySlug(slug);

  if (!token) {
    notFound();
  }

  const initialSnapshots = await getSnapshotHistory(token.id, '30d');

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
            initialRange="30d"
          />
        </div>
      </div>
    </main>
  );
}
