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
  getTokenBySlug: vi.fn(),
}));

import { GET } from '@/app/api/tokens/[slug]/route';
import { getTokenBySlug } from '@/lib/queries/tokens';

const mockGetTokenBySlug = vi.mocked(getTokenBySlug);

function createRequest(slug: string): [Request, { params: Promise<{ slug: string }> }] {
  const request = new Request(`http://localhost:3000/api/tokens/${slug}`);
  return [request, { params: Promise.resolve({ slug }) }];
}

describe('GET /api/tokens/:slug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns token detail', async () => {
    const mockToken = {
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
      rankChange30d: 2,
      categories: ['Store of Value'],
    };

    mockGetTokenBySlug.mockResolvedValue(mockToken);

    const [request, context] = createRequest('bitcoin');
    const response = await GET(request, context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe('Bitcoin');
    expect(body.data.rankChange30d).toBe(2);
  });

  it('returns 404 for non-existent slug', async () => {
    mockGetTokenBySlug.mockResolvedValue(null);

    const [request, context] = createRequest('nonexistent-token');
    const response = await GET(request, context);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Token not found');
  });

  it('returns 500 on query failure', async () => {
    mockGetTokenBySlug.mockRejectedValue(new Error('DB error'));

    const [request, context] = createRequest('bitcoin');
    const response = await GET(request, context);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to fetch token');
  });
});
