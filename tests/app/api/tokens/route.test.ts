import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  createRequestLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
    getCorrelationId: () => 'test-correlation-id',
  }),
}));

vi.mock('@/lib/queries/tokens', () => ({
  getTokenList: vi.fn(),
  getTokenBySlug: vi.fn(),
}));

import { GET } from '@/app/api/tokens/route';
import { getTokenList } from '@/lib/queries/tokens';

const mockGetTokenList = vi.mocked(getTokenList);

function createRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost:3000/api/tokens');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString());
}

const mockTokenResult = {
  tokens: [
    {
      id: 'token-1',
      cmcId: 1,
      name: 'Bitcoin',
      symbol: 'BTC',
      slug: 'bitcoin',
      logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png',
      currentRank: 1,
      price: 50000,
      marketCap: 1_000_000_000_000,
      volume24h: 30_000_000_000,
      rankChange7d: 0,
      rankChange30d: 0,
      categories: ['Store of Value'],
    },
  ],
  pagination: { total: 1, limit: 100, offset: 0, hasMore: false },
};

describe('GET /api/tokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns tokens with default params', async () => {
    mockGetTokenList.mockResolvedValue(mockTokenResult);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.tokens).toHaveLength(1);
    expect(body.data.tokens[0].name).toBe('Bitcoin');
    expect(body.data.pagination).toEqual(mockTokenResult.pagination);

    expect(mockGetTokenList).toHaveBeenCalledWith({
      limit: 100,
      offset: 0,
      sort: 'rank',
      order: 'asc',
      category: undefined,
      search: undefined,
    });
  });

  it('passes query parameters correctly', async () => {
    mockGetTokenList.mockResolvedValue({ tokens: [], pagination: { total: 0, limit: 10, offset: 20, hasMore: false } });

    await GET(createRequest({
      limit: '10',
      offset: '20',
      sort: 'price',
      order: 'desc',
      category: 'DeFi',
      search: 'eth',
    }));

    expect(mockGetTokenList).toHaveBeenCalledWith({
      limit: 10,
      offset: 20,
      sort: 'price',
      order: 'desc',
      category: 'DeFi',
      search: 'eth',
    });
  });

  it('clamps limit to MAX_LIMIT', async () => {
    mockGetTokenList.mockResolvedValue({ tokens: [], pagination: { total: 0, limit: 1000, offset: 0, hasMore: false } });

    await GET(createRequest({ limit: '9999' }));

    expect(mockGetTokenList).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 1000 })
    );
  });

  it('defaults invalid sort to rank', async () => {
    mockGetTokenList.mockResolvedValue({ tokens: [], pagination: { total: 0, limit: 100, offset: 0, hasMore: false } });

    await GET(createRequest({ sort: 'invalid' }));

    expect(mockGetTokenList).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'rank' })
    );
  });

  it('defaults invalid order to asc', async () => {
    mockGetTokenList.mockResolvedValue({ tokens: [], pagination: { total: 0, limit: 100, offset: 0, hasMore: false } });

    await GET(createRequest({ order: 'invalid' }));

    expect(mockGetTokenList).toHaveBeenCalledWith(
      expect.objectContaining({ order: 'asc' })
    );
  });

  it('returns 500 on query failure', async () => {
    mockGetTokenList.mockRejectedValue(new Error('DB connection failed'));

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to fetch tokens');
  });
});
