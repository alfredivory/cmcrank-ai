'use client';

import type { TokenSearchResult } from '@/types/api';
import { COMPARE_COLORS } from '@/lib/chart-utils';

interface CompareLegendProps {
  tokens: TokenSearchResult[];
  hiddenTokenIds: Set<string>;
  onToggleVisibility: (tokenId: string) => void;
}

export default function CompareLegend({ tokens, hiddenTokenIds, onToggleVisibility }: CompareLegendProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {tokens.map((token, index) => {
        const isHidden = hiddenTokenIds.has(token.id);
        return (
          <button
            key={token.id}
            onClick={() => onToggleVisibility(token.id)}
            className={`flex items-center gap-1.5 text-sm transition-opacity ${
              isHidden ? 'opacity-40 line-through' : ''
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: COMPARE_COLORS[index % COMPARE_COLORS.length] }}
            />
            <span className="text-white">{token.name}</span>
            <span className="text-gray-400">{token.symbol}</span>
            <span className="text-gray-500">#{token.currentRank}</span>
          </button>
        );
      })}
    </div>
  );
}
