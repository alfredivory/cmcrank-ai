'use client';

import type { TokenSearchResult } from '@/types/api';
import { COMPARE_COLORS } from '@/lib/chart-utils';

interface CompareLegendProps {
  mainToken: TokenSearchResult;
  compareTokens: TokenSearchResult[];
  hiddenTokenIds: Set<string>;
  onToggleVisibility: (tokenId: string) => void;
}

export default function CompareLegend({
  mainToken,
  compareTokens,
  hiddenTokenIds,
  onToggleVisibility,
}: CompareLegendProps) {
  const allTokens = [mainToken, ...compareTokens];

  return (
    <div className="flex flex-wrap gap-3 mt-2">
      {allTokens.map((token, index) => {
        const isHidden = hiddenTokenIds.has(token.id);
        const isMain = index === 0;

        return (
          <button
            key={token.id}
            type="button"
            onClick={() => onToggleVisibility(token.id)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer hover:bg-gray-700/50 text-sm transition-opacity ${
              isHidden ? 'opacity-40' : ''
            }`}
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: COMPARE_COLORS[index] }}
              data-testid={`color-dot-${token.id}`}
            />
            <span className={`text-gray-200 font-medium ${isHidden ? 'line-through' : ''}`}>
              {token.name}
            </span>
            <span className={`text-gray-400 ${isHidden ? 'line-through' : ''}`}>
              {token.symbol}
            </span>
            {isMain && (
              <span className="text-xs text-gray-500">(primary)</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
