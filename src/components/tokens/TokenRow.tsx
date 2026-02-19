import Link from 'next/link';
import Image from 'next/image';
import { formatPrice, formatLargeNumber, formatRankChange } from '@/lib/format';
import type { TokenListItem } from '@/types/api';

interface TokenRowProps {
  token: TokenListItem;
}

function RankChangeBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span className="text-gray-500">—</span>;
  }
  if (delta > 0) {
    return <span className="text-green-400">&#9650; {formatRankChange(delta)}</span>;
  }
  if (delta < 0) {
    return <span className="text-red-400">&#9660; {formatRankChange(delta)}</span>;
  }
  return <span className="text-gray-500">{formatRankChange(delta)}</span>;
}

export default function TokenRow({ token }: TokenRowProps) {
  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
      <td className="px-4 py-3 text-sm text-gray-400 w-16">
        {token.currentRank}
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/token/${token.slug}`}
          className="flex items-center gap-3 hover:text-blue-400 transition-colors"
        >
          {token.logoUrl ? (
            <Image
              src={token.logoUrl}
              alt={token.name}
              width={28}
              height={28}
              className="rounded-full"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400">
              {token.symbol.charAt(0)}
            </div>
          )}
          <div>
            <span className="font-medium text-white">{token.name}</span>
            <span className="ml-2 text-sm text-gray-500">{token.symbol}</span>
          </div>
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-right text-white">
        {formatPrice(token.price)}
      </td>
      <td className="px-4 py-3 text-sm text-right text-gray-300">
        {formatLargeNumber(token.marketCap)}
      </td>
      <td className="px-4 py-3 text-sm text-right text-gray-300">
        {formatLargeNumber(token.volume24h)}
      </td>
      <td className="px-4 py-3 text-sm text-right">
        <RankChangeBadge delta={token.rankChange7d} />
      </td>
      <td className="px-4 py-3 text-sm text-right">
        <RankChangeBadge delta={token.rankChange30d} />
      </td>
    </tr>
  );
}
