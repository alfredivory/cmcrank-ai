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

// ============================================================================
// Token Detail Extended (includes 90d rank change)
// ============================================================================

export interface TokenDetailExtended extends TokenListItem {
  rankChange90d: number | null;
}

// ============================================================================
// Snapshot History API Types
// ============================================================================

export type SnapshotTimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

export interface SnapshotDataPoint {
  date: string; // YYYY-MM-DD
  rank: number;
  marketCap: number;
  price: number;
  volume24h: number;
  circulatingSupply: number;
}

export interface SnapshotHistoryResponse {
  data: {
    tokenId: string;
    slug: string;
    range: SnapshotTimeRange | 'custom';
    startDate: string;
    endDate: string;
    snapshots: SnapshotDataPoint[];
  };
}

export type ChartOverlay = 'rank' | 'marketCap' | 'price' | 'circulatingSupply' | 'volume24h';

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
