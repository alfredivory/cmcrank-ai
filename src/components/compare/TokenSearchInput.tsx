'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { TokenListItem } from '@/types/api';

interface TokenSearchInputProps {
  excludeIds: Set<string>;
  onSelect: (token: TokenListItem) => void;
  disabled?: boolean;
}

export default function TokenSearchInput({ excludeIds, onSelect, disabled }: TokenSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TokenListItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/tokens?search=${encodeURIComponent(searchQuery)}&limit=10`);
      if (!response.ok) return;
      const body = await response.json();
      const filtered = (body.data.tokens as TokenListItem[]).filter(
        (t) => !excludeIds.has(t.id)
      );
      setResults(filtered);
      setIsOpen(filtered.length > 0);
      setActiveIndex(-1);
    } finally {
      setLoading(false);
    }
  }, [excludeIds]);

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }, [search]);

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectToken = useCallback((token: TokenListItem) => {
    onSelect(token);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  }, [onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          selectToken(results[activeIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  }, [isOpen, results, activeIndex, selectToken]);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0) setIsOpen(true); }}
        placeholder="Search tokens to compare..."
        disabled={disabled}
        className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none disabled:opacity-50"
        aria-label="Search tokens"
      />
      {loading && (
        <div className="absolute right-3 top-2.5 text-gray-400 text-xs">...</div>
      )}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
          {results.map((token, index) => (
            <button
              key={token.id}
              onClick={() => selectToken(token)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm transition-colors ${
                index === activeIndex
                  ? 'bg-gray-700'
                  : 'hover:bg-gray-700/50'
              }`}
            >
              {token.logoUrl && (
                <Image src={token.logoUrl} alt="" width={20} height={20} className="rounded-full" />
              )}
              <span className="text-white font-medium">{token.name}</span>
              <span className="text-gray-400">{token.symbol}</span>
              <span className="text-gray-500 ml-auto">#{token.currentRank}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
