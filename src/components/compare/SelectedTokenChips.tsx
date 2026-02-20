'use client';

import type { TokenSearchResult } from '@/types/api';
import { COMPARE_COLORS } from '@/lib/chart-utils';

interface SelectedTokenChipsProps {
  tokens: TokenSearchResult[];
  onRemove: (tokenId: string) => void;
}

export default function SelectedTokenChips({ tokens, onRemove }: SelectedTokenChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tokens.map((token, index) => (
        <div
          key={token.id}
          className="flex items-center gap-1.5 bg-gray-700 rounded-full px-3 py-1 text-sm"
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: COMPARE_COLORS[index % COMPARE_COLORS.length] }}
          />
          <span className="text-white">{token.name}</span>
          <span className="text-gray-400">{token.symbol}</span>
          <button
            onClick={() => onRemove(token.id)}
            className="ml-1 text-gray-400 hover:text-white transition-colors"
            aria-label={`Remove ${token.name}`}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
