import TokenTable from '@/components/tokens/TokenTable';
import { getTokenList, getCategories } from '@/lib/queries/tokens';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [tokenResult, categories] = await Promise.all([
    getTokenList({ limit: 100, offset: 0, sort: 'rank', order: 'asc' }),
    getCategories(),
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              CMCRank<span className="text-blue-400">.ai</span>
            </h1>
            <p className="text-gray-400 mt-1">
              Relative performance analysis through CMC rank tracking
            </p>
          </div>
          <div className="mt-4 sm:mt-0 text-sm text-gray-500 bg-gray-800/50 rounded-lg px-4 py-2 border border-gray-700">
            Tracking {tokenResult.pagination.total.toLocaleString()} tokens
          </div>
        </div>

        {/* Token Table */}
        <TokenTable
          initialTokens={tokenResult.tokens}
          initialPagination={tokenResult.pagination}
          categories={categories}
        />

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>
            <a
              href="https://github.com/alfredivory/cmcrank-ai"
              className="text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
