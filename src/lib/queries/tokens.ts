import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type {
  TokenListItem,
  TokenListParams,
  Pagination,
  CategoryItem,
  TokenDetailExtended,
  SnapshotDataPoint,
  SnapshotTimeRange,
} from '@/types/api';

function resolveLogoUrl(logoUrl: string | null, cmcId: number): string {
  return logoUrl ?? `https://s2.coinmarketcap.com/static/img/coins/64x64/${cmcId}.png`;
}

interface TokenListResult {
  tokens: TokenListItem[];
  pagination: Pagination;
}

/**
 * Get paginated token list with latest snapshot data and rank change deltas.
 * Fetches all matching tokens, sorts globally, then paginates the result.
 */
export async function getTokenList(params: TokenListParams): Promise<TokenListResult> {
  const { limit, offset, sort, order, category, search } = params;

  // Build WHERE conditions
  const whereConditions: Prisma.TokenWhereInput = {
    isTracked: true,
  };

  if (search) {
    whereConditions.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { symbol: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (category) {
    whereConditions.categories = {
      array_contains: [category],
    };
  }

  // Find the latest snapshot date
  const latestSnapshot = await prisma.dailySnapshot.findFirst({
    orderBy: { date: 'desc' },
    select: { date: true },
  });

  if (!latestSnapshot) {
    return {
      tokens: [],
      pagination: { total: 0, limit, offset, hasMore: false },
    };
  }

  const latestDate = latestSnapshot.date;

  // Calculate reference dates for rank changes
  const date7dAgo = new Date(latestDate);
  date7dAgo.setDate(date7dAgo.getDate() - 7);
  const date30dAgo = new Date(latestDate);
  date30dAgo.setDate(date30dAgo.getDate() - 30);

  // Fetch ALL matching tokens (no take/skip) so we can sort globally
  // before paginating. With ~1,000 tokens this is fine for performance.
  const tokens = await prisma.token.findMany({
    where: {
      ...whereConditions,
      snapshots: {
        some: { date: latestDate },
      },
    },
    include: {
      snapshots: {
        where: {
          date: { in: [latestDate, date7dAgo, date30dAgo] },
        },
        orderBy: { date: 'desc' },
      },
    },
  });

  // Map to TokenListItem with computed fields
  const allTokens: TokenListItem[] = tokens.map((token) => {
    const latestSnap = token.snapshots.find(
      (s) => s.date.getTime() === latestDate.getTime()
    );
    const snap7d = token.snapshots.find(
      (s) => s.date.getTime() === date7dAgo.getTime()
    );
    const snap30d = token.snapshots.find(
      (s) => s.date.getTime() === date30dAgo.getTime()
    );

    const currentRank = latestSnap?.rank ?? 0;
    const rankChange7d = snap7d ? snap7d.rank - currentRank : null;
    const rankChange30d = snap30d ? snap30d.rank - currentRank : null;

    return {
      id: token.id,
      cmcId: token.cmcId,
      name: token.name,
      symbol: token.symbol,
      slug: token.slug,
      logoUrl: resolveLogoUrl(token.logoUrl, token.cmcId),
      currentRank,
      price: latestSnap ? Number(latestSnap.priceUsd) : 0,
      marketCap: latestSnap ? Number(latestSnap.marketCap) : 0,
      volume24h: latestSnap ? Number(latestSnap.volume24h) : 0,
      rankChange7d,
      rankChange30d,
      categories: Array.isArray(token.categories) ? (token.categories as string[]) : [],
    };
  });

  // Sort globally across all tokens
  const sortKey = (sort === 'rank' ? 'currentRank' : sort) as keyof TokenListItem;
  allTokens.sort((a, b) => {
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return order === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  // Paginate the sorted results
  const paginatedTokens = allTokens.slice(offset, offset + limit);

  return {
    tokens: paginatedTokens,
    pagination: {
      total: allTokens.length,
      limit,
      offset,
      hasMore: offset + limit < allTokens.length,
    },
  };
}

/**
 * Get a single token by slug with latest snapshot and rank changes.
 */
export async function getTokenBySlug(slug: string): Promise<TokenListItem | null> {
  const latestSnapshot = await prisma.dailySnapshot.findFirst({
    orderBy: { date: 'desc' },
    select: { date: true },
  });

  if (!latestSnapshot) return null;

  const latestDate = latestSnapshot.date;
  const date7dAgo = new Date(latestDate);
  date7dAgo.setDate(date7dAgo.getDate() - 7);
  const date30dAgo = new Date(latestDate);
  date30dAgo.setDate(date30dAgo.getDate() - 30);

  const token = await prisma.token.findUnique({
    where: { slug },
    include: {
      snapshots: {
        where: {
          date: { in: [latestDate, date7dAgo, date30dAgo] },
        },
        orderBy: { date: 'desc' },
      },
    },
  });

  if (!token) return null;

  const latestSnap = token.snapshots.find(
    (s) => s.date.getTime() === latestDate.getTime()
  );
  const snap7d = token.snapshots.find(
    (s) => s.date.getTime() === date7dAgo.getTime()
  );
  const snap30d = token.snapshots.find(
    (s) => s.date.getTime() === date30dAgo.getTime()
  );

  const currentRank = latestSnap?.rank ?? 0;

  return {
    id: token.id,
    cmcId: token.cmcId,
    name: token.name,
    symbol: token.symbol,
    slug: token.slug,
    logoUrl: resolveLogoUrl(token.logoUrl, token.cmcId),
    currentRank,
    price: latestSnap ? Number(latestSnap.priceUsd) : 0,
    marketCap: latestSnap ? Number(latestSnap.marketCap) : 0,
    volume24h: latestSnap ? Number(latestSnap.volume24h) : 0,
    rankChange7d: snap7d ? snap7d.rank - currentRank : null,
    rankChange30d: snap30d ? snap30d.rank - currentRank : null,
    categories: Array.isArray(token.categories) ? (token.categories as string[]) : [],
  };
}

/**
 * Get a single token by slug with latest snapshot and rank changes (including 90d).
 */
export async function getTokenDetailBySlug(slug: string): Promise<TokenDetailExtended | null> {
  const latestSnapshot = await prisma.dailySnapshot.findFirst({
    orderBy: { date: 'desc' },
    select: { date: true },
  });

  if (!latestSnapshot) return null;

  const latestDate = latestSnapshot.date;
  const date7dAgo = new Date(latestDate);
  date7dAgo.setDate(date7dAgo.getDate() - 7);
  const date30dAgo = new Date(latestDate);
  date30dAgo.setDate(date30dAgo.getDate() - 30);
  const date90dAgo = new Date(latestDate);
  date90dAgo.setDate(date90dAgo.getDate() - 90);

  const token = await prisma.token.findUnique({
    where: { slug },
    include: {
      snapshots: {
        where: {
          date: { in: [latestDate, date7dAgo, date30dAgo, date90dAgo] },
        },
        orderBy: { date: 'desc' },
      },
    },
  });

  if (!token) return null;

  const latestSnap = token.snapshots.find(
    (s) => s.date.getTime() === latestDate.getTime()
  );
  const snap7d = token.snapshots.find(
    (s) => s.date.getTime() === date7dAgo.getTime()
  );
  const snap30d = token.snapshots.find(
    (s) => s.date.getTime() === date30dAgo.getTime()
  );
  const snap90d = token.snapshots.find(
    (s) => s.date.getTime() === date90dAgo.getTime()
  );

  const currentRank = latestSnap?.rank ?? 0;

  return {
    id: token.id,
    cmcId: token.cmcId,
    name: token.name,
    symbol: token.symbol,
    slug: token.slug,
    logoUrl: resolveLogoUrl(token.logoUrl, token.cmcId),
    currentRank,
    price: latestSnap ? Number(latestSnap.priceUsd) : 0,
    marketCap: latestSnap ? Number(latestSnap.marketCap) : 0,
    volume24h: latestSnap ? Number(latestSnap.volume24h) : 0,
    rankChange7d: snap7d ? snap7d.rank - currentRank : null,
    rankChange30d: snap30d ? snap30d.rank - currentRank : null,
    rankChange90d: snap90d ? snap90d.rank - currentRank : null,
    categories: Array.isArray(token.categories) ? (token.categories as string[]) : [],
  };
}

function getRangeStartDate(latestDate: Date, range: SnapshotTimeRange): Date | null {
  if (range === 'all') return null;
  const start = new Date(latestDate);
  switch (range) {
    case '7d': start.setDate(start.getDate() - 7); break;
    case '30d': start.setDate(start.getDate() - 30); break;
    case '90d': start.setDate(start.getDate() - 90); break;
    case '1y': start.setFullYear(start.getFullYear() - 1); break;
  }
  return start;
}

/**
 * Get snapshot history for a token within a date range.
 * Returns snapshots sorted ascending by date.
 */
export async function getSnapshotHistory(
  tokenId: string,
  range: SnapshotTimeRange,
  customStart?: Date,
  customEnd?: Date,
): Promise<SnapshotDataPoint[]> {
  const dateFilter: Prisma.DailySnapshotWhereInput = { tokenId };

  if (customStart && customEnd) {
    dateFilter.date = { gte: customStart, lte: customEnd };
  } else {
    const latestSnapshot = await prisma.dailySnapshot.findFirst({
      where: { tokenId },
      orderBy: { date: 'desc' },
      select: { date: true },
    });
    if (!latestSnapshot) return [];

    const startDate = getRangeStartDate(latestSnapshot.date, range);
    if (startDate) {
      dateFilter.date = { gte: startDate, lte: latestSnapshot.date };
    }
  }

  const snapshots = await prisma.dailySnapshot.findMany({
    where: dateFilter,
    orderBy: { date: 'asc' },
    select: {
      date: true,
      rank: true,
      marketCap: true,
      priceUsd: true,
      volume24h: true,
      circulatingSupply: true,
    },
  });

  return snapshots.map((s) => ({
    date: s.date.toISOString().split('T')[0],
    rank: s.rank,
    marketCap: Number(s.marketCap),
    price: Number(s.priceUsd),
    volume24h: Number(s.volume24h),
    circulatingSupply: Number(s.circulatingSupply),
  }));
}

/**
 * Get unique categories from all tokens with counts.
 */
export async function getCategories(): Promise<CategoryItem[]> {
  const tokens = await prisma.token.findMany({
    where: { isTracked: true },
    select: { categories: true },
  });

  const categoryMap = new Map<string, number>();

  for (const token of tokens) {
    if (Array.isArray(token.categories)) {
      for (const cat of token.categories as string[]) {
        categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
      }
    }
  }

  return Array.from(categoryMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

