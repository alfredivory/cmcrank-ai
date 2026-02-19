// ============================================================================
// Token List API Types
// ============================================================================

export interface TokenListItem {
  id: string;
  cmcId: number;
  name: string;
  symbol: string;
  slug: string;
  logoUrl: string | null;
  currentRank: number;
  price: number;
  marketCap: number;
  volume24h: number;
  rankChange7d: number | null;
  rankChange30d: number | null;
  categories: string[];
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface TokenListResponse {
  data: {
    tokens: TokenListItem[];
    pagination: Pagination;
  };
}

export interface TokenDetailResponse {
  data: TokenListItem;
}

export interface CategoryItem {
  name: string;
  count: number;
}

export interface CategoriesResponse {
  data: CategoryItem[];
}

// ============================================================================
// Shared query params
// ============================================================================

export type TokenSortField = 'rank' | 'name' | 'price' | 'marketCap' | 'volume24h' | 'rankChange7d' | 'rankChange30d';
export type SortOrder = 'asc' | 'desc';

export interface TokenListParams {
  limit: number;
  offset: number;
  sort: TokenSortField;
  order: SortOrder;
  category?: string;
  search?: string;
}
