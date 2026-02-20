'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { TokenSearchResult, TokenListItem } from '@/types/api';
import { COMPARE_COLORS } from '@/lib/chart-utils';
import TokenSearchInput from '@/components/compare/TokenSearchInput';

interface CompareDropdownProps {
  mainTokenId: string;
  compareTokens: TokenSearchResult[];
  onAddToken: (token: TokenListItem) => void;
  onRemoveToken: (tokenId: string) => void;
}

export default function CompareDropdown({
  mainTokenId,
  compareTokens,
  onAddToken,
  onRemoveToken,
}: CompareDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Close on click-outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const hasTokens = compareTokens.length > 0;
  const excludeIds = new Set([mainTokenId, ...compareTokens.map((t) => t.id)]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggleDropdown}
        className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
          hasTokens
            ? 'bg-gray-700 hover:bg-gray-600 border-blue-500/50 text-blue-300'
            : 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-300'
        }`}
      >
        Compare{hasTokens ? ` (${compareTokens.length})` : ''}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 w-72 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-30 p-3">
          <TokenSearchInput
            excludeIds={excludeIds}
            onSelect={onAddToken}
            disabled={compareTokens.length >= 4}
            autoFocus
          />

          <div className="mt-3">
            {compareTokens.length === 0 ? (
              <p className="text-gray-400 text-xs text-center py-2">
                Search to add tokens for comparison
              </p>
            ) : (
              <ul className="space-y-2">
                {compareTokens.map((token, index) => (
                  <li key={token.id} className="flex items-center gap-2 text-sm">
                    <span
                      className="inline-block w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          COMPARE_COLORS[(index + 1) % COMPARE_COLORS.length],
                      }}
                    />
                    <span className="text-white">{token.name}</span>
                    <span className="text-gray-400">{token.symbol}</span>
                    <button
                      onClick={() => onRemoveToken(token.id)}
                      className="ml-auto text-gray-500 hover:text-red-400 transition-colors"
                      aria-label={`Remove ${token.name}`}
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
