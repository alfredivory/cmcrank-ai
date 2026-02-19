import TokenTable from '@/components/tokens/TokenTable';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import { getTokenList, getCategories, getLatestSnapshotDate } from '@/lib/queries/tokens';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [tokenResult, categories, latestSnapshotDate] = await Promise.all([
    getTokenList({ limit: 100, offset: 0, sort: 'rank', order: 'asc' }),
    getCategories(),
    getLatestSnapshotDate(),
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <SiteHeader
          rightContent={
            <div className="text-sm text-gray-500 bg-gray-800/50 rounded-lg px-4 py-2 border border-gray-700">
              Tracking {tokenResult.pagination.total.toLocaleString()} tokens
            </div>
          }
        />

        {/* Token Table */}
        <TokenTable
          initialTokens={tokenResult.tokens}
          initialPagination={tokenResult.pagination}
          categories={categories}
        />

        <SiteFooter latestSnapshotDate={latestSnapshotDate} />
      </div>
    </main>
  );
}
