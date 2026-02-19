import Image from 'next/image';
import { formatPrice, formatLargeNumber, formatRankChange } from '@/lib/format';
import type { TokenDetailExtended } from '@/types/api';

interface TokenHeaderProps {
  token: TokenDetailExtended;
}

function RankChangeBadge({ label, delta }: { label: string; delta: number | null }) {
  if (delta === null) {
    return (
      <div className="text-center">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-gray-500">—</div>
      </div>
    );
  }

  let colorClass = 'text-gray-500';
  if (delta > 0) colorClass = 'text-green-400';
  if (delta < 0) colorClass = 'text-red-400';

  return (
    <div className="text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={colorClass}>
        {delta > 0 && '\u25B2 '}
        {delta < 0 && '\u25BC '}
        {formatRankChange(delta)}
      </div>
    </div>
  );
}

export default function TokenHeader({ token }: TokenHeaderProps) {
  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
      {/* Top row: logo + name + rank */}
      <div className="flex items-center gap-4 mb-4">
        {token.logoUrl ? (
          <Image
            src={token.logoUrl}
            alt={token.name}
            width={48}
            height={48}
            className="rounded-full"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-lg text-gray-400">
            {token.symbol.charAt(0)}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">
            {token.name}
            <span className="ml-2 text-lg text-gray-400">{token.symbol}</span>
          </h1>
        </div>
        <div className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium">
          Rank #{token.currentRank}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
        <div>
          <div className="text-xs text-gray-500">Price</div>
          <div className="text-white font-medium">{formatPrice(token.price)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Market Cap</div>
          <div className="text-white font-medium">{formatLargeNumber(token.marketCap)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Volume 24h</div>
          <div className="text-white font-medium">{formatLargeNumber(token.volume24h)}</div>
        </div>
        <RankChangeBadge label="7D Change" delta={token.rankChange7d} />
        <RankChangeBadge label="30D Change" delta={token.rankChange30d} />
        <RankChangeBadge label="90D Change" delta={token.rankChange90d} />
      </div>

      {/* Category tags */}
      {token.categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {token.categories.map((category) => (
            <span
              key={category}
              className="bg-gray-700/50 text-gray-300 px-3 py-1 rounded-full text-xs"
            >
              {category}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
