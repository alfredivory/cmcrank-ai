import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockTokenCount,
  mockTokenFindMany,
  mockTokenFindUnique,
  mockSnapshotFindFirst,
} = vi.hoisted(() => ({
  mockTokenCount: vi.fn(),
  mockTokenFindMany: vi.fn(),
  mockTokenFindUnique: vi.fn(),
  mockSnapshotFindFirst: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    token: {
      count: mockTokenCount,
      findMany: mockTokenFindMany,
      findUnique: mockTokenFindUnique,
    },
    dailySnapshot: {
      findFirst: mockSnapshotFindFirst,
    },
  },
}));

import { getTokenList, getTokenBySlug, getCategories, getLatestSnapshotDate } from '@/lib/queries/tokens';

function createDecimal(value: number) {
  return {
    toFixed: (digits?: number) => value.toFixed(digits),
    toString: () => value.toString(),
    valueOf: () => value,
  };
}

const latestDate = new Date('2026-02-18');
const date7dAgo = new Date('2026-02-11');
const date30dAgo = new Date('2026-01-19');

function createMockToken(overrides: {
  id?: string;
  cmcId?: number;
  name?: string;
  symbol?: string;
  slug?: string;
  rank?: number;
  rank7d?: number | null;
  rank30d?: number | null;
  price?: number;
  marketCap?: number;
  volume24h?: number;
  categories?: string[] | null;
} = {}) {
  const {
    id = 'token-1',
    cmcId = 1,
    name = 'Bitcoin',
    symbol = 'BTC',
    slug = 'bitcoin',
    rank = 1,
    rank7d = 1,
    rank30d = 2,
    price = 50000,
    marketCap = 1_000_000_000_000,
    volume24h = 30_000_000_000,
    categories = ['Store of Value', 'Layer 1'],
  } = overrides;

  const snapshots = [
    {
      id: `snap-latest-${id}`,
      tokenId: id,
      date: latestDate,
      rank,
      priceUsd: createDecimal(price),
      marketCap: createDecimal(marketCap),
      volume24h: createDecimal(volume24h),
      circulatingSupply: createDecimal(19000000),
      createdAt: new Date(),
    },
  ];

  if (rank7d !== null) {
    snapshots.push({
      id: `snap-7d-${id}`,
      tokenId: id,
      date: date7dAgo,
      rank: rank7d ?? rank,
      priceUsd: createDecimal(price * 0.95),
      marketCap: createDecimal(marketCap * 0.95),
      volume24h: createDecimal(volume24h * 0.9),
      circulatingSupply: createDecimal(19000000),
      createdAt: new Date(),
    });
  }

  if (rank30d !== null) {
    snapshots.push({
      id: `snap-30d-${id}`,
      tokenId: id,
      date: date30dAgo,
      rank: rank30d ?? rank,
      priceUsd: createDecimal(price * 0.85),
      marketCap: createDecimal(marketCap * 0.85),
      volume24h: createDecimal(volume24h * 0.8),
      circulatingSupply: createDecimal(19000000),
      createdAt: new Date(),
    });
  }

  return {
    id,
    cmcId,
    name,
    symbol,
    slug,
    logoUrl: `https://s2.coinmarketcap.com/static/img/coins/64x64/${cmcId}.png`,
    isTracked: true,
    categories,
    chain: null,
    launchDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    snapshots,
  };
}

describe('getTokenList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns tokens with pagination', async () => {
    const btc = createMockToken();
    const eth = createMockToken({
      id: 'token-2', cmcId: 1027, name: 'Ethereum', symbol: 'ETH', slug: 'ethereum',
      rank: 2, rank7d: 3, rank30d: 4, price: 3000, marketCap: 350_000_000_000, volume24h: 15_000_000_000,
      categories: ['Smart Contracts', 'Layer 1'],
    });

    mockSnapshotFindFirst.mockResolvedValue({ date: latestDate });
    mockTokenFindMany.mockResolvedValue([btc, eth]);

    const result = await getTokenList({
      limit: 100, offset: 0, sort: 'rank', order: 'asc',
    });

    expect(result.tokens).toHaveLength(2);
    expect(result.pagination).toEqual({
      total: 2, limit: 100, offset: 0, hasMore: false,
    });
  });

  it('computes rank change deltas correctly', async () => {
    const token = createMockToken({
      rank: 2, rank7d: 5, rank30d: 10,
    });

    mockSnapshotFindFirst.mockResolvedValue({ date: latestDate });
    mockTokenFindMany.mockResolvedValue([token]);

    const result = await getTokenList({
      limit: 100, offset: 0, sort: 'rank', order: 'asc',
    });

    const btc = result.tokens[0];
    // rankChange7d = oldRank - currentRank = 5 - 2 = 3 (improved by 3)
    expect(btc.rankChange7d).toBe(3);
    // rankChange30d = oldRank - currentRank = 10 - 2 = 8 (improved by 8)
    expect(btc.rankChange30d).toBe(8);
  });

  it('returns null rank changes when historical data is missing', async () => {
    const token = createMockToken({ rank7d: null, rank30d: null });

    mockSnapshotFindFirst.mockResolvedValue({ date: latestDate });
    mockTokenFindMany.mockResolvedValue([token]);

    const result = await getTokenList({
      limit: 100, offset: 0, sort: 'rank', order: 'asc',
    });

    expect(result.tokens[0].rankChange7d).toBeNull();
    expect(result.tokens[0].rankChange30d).toBeNull();
  });

  it('returns empty result when no snapshots exist', async () => {
    mockSnapshotFindFirst.mockResolvedValue(null);

    const result = await getTokenList({
      limit: 100, offset: 0, sort: 'rank', order: 'asc',
    });

    expect(result.tokens).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });

  it('passes search filter to query', async () => {
    mockSnapshotFindFirst.mockResolvedValue({ date: latestDate });
    mockTokenFindMany.mockResolvedValue([]);

    await getTokenList({
      limit: 100, offset: 0, sort: 'rank', order: 'asc', search: 'bitcoin',
    });

    expect(mockTokenFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { name: { contains: 'bitcoin', mode: 'insensitive' } },
            { symbol: { contains: 'bitcoin', mode: 'insensitive' } },
          ],
        }),
      })
    );
  });

  it('passes category filter to query', async () => {
    mockSnapshotFindFirst.mockResolvedValue({ date: latestDate });
    mockTokenFindMany.mockResolvedValue([]);

    await getTokenList({
      limit: 100, offset: 0, sort: 'rank', order: 'asc', category: 'Layer 1',
    });

    expect(mockTokenFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categories: { array_contains: ['Layer 1'] },
        }),
      })
    );
  });

  it('paginates results in memory after global sort', async () => {
    const tokens = Array.from({ length: 5 }, (_, i) =>
      createMockToken({
        id: `token-${i + 1}`,
        cmcId: i + 1,
        name: `Token ${i + 1}`,
        symbol: `T${i + 1}`,
        slug: `token-${i + 1}`,
        rank: i + 1,
      })
    );

    mockSnapshotFindFirst.mockResolvedValue({ date: latestDate });
    mockTokenFindMany.mockResolvedValue(tokens);

    const result = await getTokenList({
      limit: 2, offset: 2, sort: 'rank', order: 'asc',
    });

    // Should return tokens 3 and 4 (0-indexed offset 2, limit 2)
    expect(result.tokens).toHaveLength(2);
    expect(result.tokens[0].currentRank).toBe(3);
    expect(result.tokens[1].currentRank).toBe(4);
    expect(result.pagination).toEqual({
      total: 5, limit: 2, offset: 2, hasMore: true,
    });
  });

  it('extracts categories from token JSON field', async () => {
    const token = createMockToken({ categories: ['DeFi', 'Layer 2'] });

    mockSnapshotFindFirst.mockResolvedValue({ date: latestDate });
    mockTokenFindMany.mockResolvedValue([token]);

    const result = await getTokenList({
      limit: 100, offset: 0, sort: 'rank', order: 'asc',
    });

    expect(result.tokens[0].categories).toEqual(['DeFi', 'Layer 2']);
  });

  it('handles tokens with null categories', async () => {
    const token = createMockToken({ categories: null });

    mockSnapshotFindFirst.mockResolvedValue({ date: latestDate });
    mockTokenFindMany.mockResolvedValue([token]);

    const result = await getTokenList({
      limit: 100, offset: 0, sort: 'rank', order: 'asc',
    });

    expect(result.tokens[0].categories).toEqual([]);
  });
});

describe('getTokenBySlug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns token with snapshot data', async () => {
    const token = createMockToken();

    mockSnapshotFindFirst.mockResolvedValue({ date: latestDate });
    mockTokenFindUnique.mockResolvedValue(token);

    const result = await getTokenBySlug('bitcoin');

    expect(result).not.toBeNull();
    expect(result!.name).toBe('Bitcoin');
    expect(result!.symbol).toBe('BTC');
    expect(result!.currentRank).toBe(1);
    expect(result!.price).toBe(50000);
  });

  it('returns null for non-existent slug', async () => {
    mockSnapshotFindFirst.mockResolvedValue({ date: latestDate });
    mockTokenFindUnique.mockResolvedValue(null);

    const result = await getTokenBySlug('nonexistent');

    expect(result).toBeNull();
  });

  it('returns null when no snapshots exist', async () => {
    mockSnapshotFindFirst.mockResolvedValue(null);

    const result = await getTokenBySlug('bitcoin');

    expect(result).toBeNull();
  });
});

describe('getCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unique categories with counts sorted by count desc', async () => {
    mockTokenFindMany.mockResolvedValue([
      { categories: ['Layer 1', 'DeFi'] },
      { categories: ['Layer 1', 'Smart Contracts'] },
      { categories: ['DeFi'] },
    ]);

    const result = await getCategories();

    expect(result).toEqual([
      { name: 'Layer 1', count: 2 },
      { name: 'DeFi', count: 2 },
      { name: 'Smart Contracts', count: 1 },
    ]);
  });

  it('handles tokens with null categories', async () => {
    mockTokenFindMany.mockResolvedValue([
      { categories: null },
      { categories: ['Layer 1'] },
    ]);

    const result = await getCategories();

    expect(result).toEqual([{ name: 'Layer 1', count: 1 }]);
  });

  it('returns empty array when no tokens exist', async () => {
    mockTokenFindMany.mockResolvedValue([]);

    const result = await getCategories();

    expect(result).toEqual([]);
  });
});

describe('getLatestSnapshotDate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the latest snapshot date', async () => {
    mockSnapshotFindFirst.mockResolvedValue({ date: latestDate });

    const result = await getLatestSnapshotDate();

    expect(result).toEqual(latestDate);
  });

  it('returns null when no snapshots exist', async () => {
    mockSnapshotFindFirst.mockResolvedValue(null);

    const result = await getLatestSnapshotDate();

    expect(result).toBeNull();
  });
});
