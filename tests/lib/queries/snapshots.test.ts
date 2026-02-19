import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockTokenFindUnique,
  mockSnapshotFindFirst,
  mockSnapshotFindMany,
} = vi.hoisted(() => ({
  mockTokenFindUnique: vi.fn(),
  mockSnapshotFindFirst: vi.fn(),
  mockSnapshotFindMany: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    token: {
      findUnique: mockTokenFindUnique,
    },
    dailySnapshot: {
      findFirst: mockSnapshotFindFirst,
      findMany: mockSnapshotFindMany,
    },
  },
}));

import { getTokenDetailBySlug, getSnapshotHistory } from '@/lib/queries/tokens';

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
const date90dAgo = new Date('2025-11-20');

describe('getTokenDetailBySlug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns token with 90d rank change', async () => {
    const token = {
      id: 'token-1',
      cmcId: 1,
      name: 'Bitcoin',
      symbol: 'BTC',
      slug: 'bitcoin',
      logoUrl: null,
      isTracked: true,
      categories: ['Store of Value'],
      snapshots: [
        {
          date: latestDate,
          rank: 1,
          priceUsd: createDecimal(50000),
          marketCap: createDecimal(1_000_000_000_000),
          volume24h: createDecimal(30_000_000_000),
          circulatingSupply: createDecimal(19000000),
        },
        {
          date: date7dAgo,
          rank: 1,
          priceUsd: createDecimal(48000),
          marketCap: createDecimal(950_000_000_000),
          volume24h: createDecimal(28_000_000_000),
          circulatingSupply: createDecimal(19000000),
        },
        {
          date: date30dAgo,
          rank: 2,
          priceUsd: createDecimal(45000),
          marketCap: createDecimal(900_000_000_000),
          volume24h: createDecimal(25_000_000_000),
          circulatingSupply: createDecimal(19000000),
        },
        {
          date: date90dAgo,
          rank: 3,
          priceUsd: createDecimal(40000),
          marketCap: createDecimal(800_000_000_000),
          volume24h: createDecimal(20_000_000_000),
          circulatingSupply: createDecimal(19000000),
        },
      ],
    };

    mockSnapshotFindFirst.mockResolvedValue({ date: latestDate });
    mockTokenFindUnique.mockResolvedValue(token);

    const result = await getTokenDetailBySlug('bitcoin');

    expect(result).not.toBeNull();
    expect(result!.name).toBe('Bitcoin');
    expect(result!.rankChange7d).toBe(0); // 1 - 1 = 0
    expect(result!.rankChange30d).toBe(1); // 2 - 1 = 1
    expect(result!.rankChange90d).toBe(2); // 3 - 1 = 2
  });

  it('returns null rankChange90d when 90d snapshot is missing', async () => {
    const token = {
      id: 'token-1',
      cmcId: 1,
      name: 'Bitcoin',
      symbol: 'BTC',
      slug: 'bitcoin',
      logoUrl: null,
      isTracked: true,
      categories: [],
      snapshots: [
        {
          date: latestDate,
          rank: 1,
          priceUsd: createDecimal(50000),
          marketCap: createDecimal(1_000_000_000_000),
          volume24h: createDecimal(30_000_000_000),
          circulatingSupply: createDecimal(19000000),
        },
      ],
    };

    mockSnapshotFindFirst.mockResolvedValue({ date: latestDate });
    mockTokenFindUnique.mockResolvedValue(token);

    const result = await getTokenDetailBySlug('bitcoin');

    expect(result).not.toBeNull();
    expect(result!.rankChange90d).toBeNull();
  });

  it('returns null for non-existent slug', async () => {
    mockSnapshotFindFirst.mockResolvedValue({ date: latestDate });
    mockTokenFindUnique.mockResolvedValue(null);

    const result = await getTokenDetailBySlug('nonexistent');
    expect(result).toBeNull();
  });

  it('returns null when no snapshots exist', async () => {
    mockSnapshotFindFirst.mockResolvedValue(null);

    const result = await getTokenDetailBySlug('bitcoin');
    expect(result).toBeNull();
  });

  it('resolves logo URL via CMC CDN when logoUrl is null', async () => {
    const token = {
      id: 'token-1',
      cmcId: 1,
      name: 'Bitcoin',
      symbol: 'BTC',
      slug: 'bitcoin',
      logoUrl: null,
      isTracked: true,
      categories: [],
      snapshots: [
        {
          date: latestDate,
          rank: 1,
          priceUsd: createDecimal(50000),
          marketCap: createDecimal(1_000_000_000_000),
          volume24h: createDecimal(30_000_000_000),
          circulatingSupply: createDecimal(19000000),
        },
      ],
    };

    mockSnapshotFindFirst.mockResolvedValue({ date: latestDate });
    mockTokenFindUnique.mockResolvedValue(token);

    const result = await getTokenDetailBySlug('bitcoin');
    expect(result!.logoUrl).toBe('https://s2.coinmarketcap.com/static/img/coins/64x64/1.png');
  });
});

describe('getSnapshotHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns snapshots for a range in ascending date order', async () => {
    const snapshots = [
      {
        date: new Date('2026-02-11'),
        rank: 2,
        marketCap: createDecimal(900_000_000_000),
        priceUsd: createDecimal(45000),
        volume24h: createDecimal(25_000_000_000),
        circulatingSupply: createDecimal(19000000),
      },
      {
        date: new Date('2026-02-18'),
        rank: 1,
        marketCap: createDecimal(1_000_000_000_000),
        priceUsd: createDecimal(50000),
        volume24h: createDecimal(30_000_000_000),
        circulatingSupply: createDecimal(19000000),
      },
    ];

    mockSnapshotFindFirst.mockResolvedValue({ date: new Date('2026-02-18') });
    mockSnapshotFindMany.mockResolvedValue(snapshots);

    const result = await getSnapshotHistory('token-1', '7d');

    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-02-11');
    expect(result[1].date).toBe('2026-02-18');
    expect(result[0].rank).toBe(2);
    expect(result[1].rank).toBe(1);
  });

  it('converts Decimal fields to numbers', async () => {
    const snapshots = [
      {
        date: new Date('2026-02-18'),
        rank: 1,
        marketCap: createDecimal(1_000_000_000_000),
        priceUsd: createDecimal(50000.123456789012),
        volume24h: createDecimal(30_000_000_000),
        circulatingSupply: createDecimal(19000000.12345678),
      },
    ];

    mockSnapshotFindFirst.mockResolvedValue({ date: new Date('2026-02-18') });
    mockSnapshotFindMany.mockResolvedValue(snapshots);

    const result = await getSnapshotHistory('token-1', '7d');

    expect(typeof result[0].marketCap).toBe('number');
    expect(typeof result[0].price).toBe('number');
    expect(typeof result[0].volume24h).toBe('number');
    expect(typeof result[0].circulatingSupply).toBe('number');
  });

  it('returns empty array when no snapshots exist', async () => {
    mockSnapshotFindFirst.mockResolvedValue(null);

    const result = await getSnapshotHistory('token-1', '7d');

    expect(result).toEqual([]);
  });

  it('uses custom start and end dates when provided', async () => {
    mockSnapshotFindMany.mockResolvedValue([]);

    const customStart = new Date('2025-01-01');
    const customEnd = new Date('2025-06-30');

    await getSnapshotHistory('token-1', 'all', customStart, customEnd);

    expect(mockSnapshotFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tokenId: 'token-1',
          date: { gte: customStart, lte: customEnd },
        }),
      })
    );
  });

  it('does not filter date for "all" range without custom dates', async () => {
    mockSnapshotFindFirst.mockResolvedValue({ date: new Date('2026-02-18') });
    mockSnapshotFindMany.mockResolvedValue([]);

    await getSnapshotHistory('token-1', 'all');

    expect(mockSnapshotFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tokenId: 'token-1' },
      })
    );
  });

  it('calculates correct start date for 1y range', async () => {
    const latestDateVal = new Date('2026-02-18');
    mockSnapshotFindFirst.mockResolvedValue({ date: latestDateVal });
    mockSnapshotFindMany.mockResolvedValue([]);

    await getSnapshotHistory('token-1', '1y');

    expect(mockSnapshotFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: {
            gte: new Date('2025-02-18'),
            lte: latestDateVal,
          },
        }),
      })
    );
  });
});
