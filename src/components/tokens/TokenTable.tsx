'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import TokenRow from './TokenRow';
import type { TokenListItem, Pagination, CategoryItem, TokenSortField, SortOrder } from '@/types/api';

interface TokenTableProps {
  initialTokens: TokenListItem[];
  initialPagination: Pagination;
  categories: CategoryItem[];
}

const SORT_COLUMNS: { key: TokenSortField; label: string; align: 'left' | 'right' }[] = [
  { key: 'rank', label: '#', align: 'left' },
  { key: 'name', label: 'Name', align: 'left' },
  { key: 'price', label: 'Price', align: 'right' },
  { key: 'marketCap', label: 'Market Cap', align: 'right' },
  { key: 'volume24h', label: 'Volume 24h', align: 'right' },
  { key: 'rankChange7d', label: '7d', align: 'right' },
  { key: 'rankChange30d', label: '30d', align: 'right' },
];

export default function TokenTable({ initialTokens, initialPagination, categories }: TokenTableProps) {
  const [tokens, setTokens] = useState(initialTokens);
  const [pagination, setPagination] = useState(initialPagination);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortField, setSortField] = useState<TokenSortField>('rank');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchTokens = useCallback(async (params: {
    search?: string;
    category?: string;
    sort?: TokenSortField;
    order?: SortOrder;
    offset?: number;
  }) => {
    setLoading(true);
    try {
      const url = new URL('/api/tokens', window.location.origin);
      url.searchParams.set('limit', String(pagination.limit));
      url.searchParams.set('offset', String(params.offset ?? 0));
      url.searchParams.set('sort', params.sort ?? sortField);
      url.searchParams.set('order', params.order ?? sortOrder);
      if (params.search) url.searchParams.set('search', params.search);
      if (params.category) url.searchParams.set('category', params.category);

      const response = await fetch(url.toString());
      const body = await response.json();

      if (body.data) {
        setTokens(body.data.tokens);
        setPagination(body.data.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, sortField, sortOrder]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchTokens({ search: value, category: selectedCategory, offset: 0 });
    }, 300);
  }, [fetchTokens, selectedCategory]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    fetchTokens({ search, category: category || undefined, offset: 0 });
  }, [fetchTokens, search]);

  const handleSort = useCallback((field: TokenSortField) => {
    const newOrder: SortOrder = field === sortField && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortOrder(newOrder);
    fetchTokens({ search, category: selectedCategory || undefined, sort: field, order: newOrder, offset: 0 });
  }, [sortField, sortOrder, fetchTokens, search, selectedCategory]);

  const handlePageChange = useCallback((newOffset: number) => {
    fetchTokens({ search, category: selectedCategory || undefined, offset: newOffset });
  }, [fetchTokens, search, selectedCategory]);

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div>
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search tokens..."
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <select
          value={selectedCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.name} value={cat.name}>
              {cat.name} ({cat.count})
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-800/50">
              {SORT_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.label}
                  {sortField === col.key && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '\u2191' : '\u2193'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={loading ? 'opacity-50' : ''}>
            {tokens.length > 0 ? (
              tokens.map((token) => (
                <TokenRow key={token.id} token={token} />
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  {loading ? 'Loading tokens...' : 'No tokens found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
          <span>
            Showing {pagination.offset + 1}–{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.offset - pagination.limit)}
              disabled={pagination.offset === 0 || loading}
              className="px-3 py-1 rounded bg-gray-800 border border-gray-700 hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <span className="px-3 py-1">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.offset + pagination.limit)}
              disabled={!pagination.hasMore || loading}
              className="px-3 py-1 rounded bg-gray-800 border border-gray-700 hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
