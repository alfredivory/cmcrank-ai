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
  getSnapshotHistory: vi.fn(),
}));

import { GET } from '@/app/api/tokens/[slug]/snapshots/route';
import { getTokenBySlug, getSnapshotHistory } from '@/lib/queries/tokens';

const mockGetTokenBySlug = vi.mocked(getTokenBySlug);
const mockGetSnapshotHistory = vi.mocked(getSnapshotHistory);

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

function createRequest(slug: string, params?: Record<string, string>): [Request, { params: Promise<{ slug: string }> }] {
  const url = new URL(`http://localhost:3000/api/tokens/${slug}/snapshots`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  const request = new Request(url.toString());
  return [request, { params: Promise.resolve({ slug }) }];
}

describe('GET /api/tokens/:slug/snapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns snapshots with default 30d range', async () => {
    const snapshots = [
      { date: '2026-01-19', rank: 2, marketCap: 900e9, price: 45000, volume24h: 25e9, circulatingSupply: 19000000 },
      { date: '2026-02-18', rank: 1, marketCap: 1e12, price: 50000, volume24h: 30e9, circulatingSupply: 19000000 },
    ];

    mockGetTokenBySlug.mockResolvedValue(mockToken);
    mockGetSnapshotHistory.mockResolvedValue(snapshots);

    const [request, context] = createRequest('bitcoin');
    const response = await GET(request, context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.tokenId).toBe('token-1');
    expect(body.data.slug).toBe('bitcoin');
    expect(body.data.range).toBe('30d');
    expect(body.data.snapshots).toHaveLength(2);
    expect(mockGetSnapshotHistory).toHaveBeenCalledWith('token-1', '30d');
  });

  it('returns snapshots with specified range', async () => {
    mockGetTokenBySlug.mockResolvedValue(mockToken);
    mockGetSnapshotHistory.mockResolvedValue([]);

    const [request, context] = createRequest('bitcoin', { range: '7d' });
    const response = await GET(request, context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.range).toBe('7d');
    expect(mockGetSnapshotHistory).toHaveBeenCalledWith('token-1', '7d');
  });

  it('returns snapshots with custom date range', async () => {
    const snapshots = [
      { date: '2025-01-01', rank: 5, marketCap: 500e9, price: 30000, volume24h: 15e9, circulatingSupply: 19000000 },
    ];

    mockGetTokenBySlug.mockResolvedValue(mockToken);
    mockGetSnapshotHistory.mockResolvedValue(snapshots);

    const [request, context] = createRequest('bitcoin', { start: '2025-01-01', end: '2025-06-30' });
    const response = await GET(request, context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.range).toBe('custom');
    expect(body.data.startDate).toBe('2025-01-01');
    expect(body.data.endDate).toBe('2025-06-30');
    expect(mockGetSnapshotHistory).toHaveBeenCalledWith(
      'token-1',
      'all',
      new Date('2025-01-01'),
      new Date('2025-06-30')
    );
  });

  it('returns 404 for non-existent slug', async () => {
    mockGetTokenBySlug.mockResolvedValue(null);

    const [request, context] = createRequest('nonexistent');
    const response = await GET(request, context);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Token not found');
  });

  it('returns 400 for invalid date format', async () => {
    mockGetTokenBySlug.mockResolvedValue(mockToken);

    const [request, context] = createRequest('bitcoin', { start: 'bad-date', end: '2025-06-30' });
    const response = await GET(request, context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Invalid date format');
  });

  it('returns 400 when start date is after end date', async () => {
    mockGetTokenBySlug.mockResolvedValue(mockToken);

    const [request, context] = createRequest('bitcoin', { start: '2025-06-30', end: '2025-01-01' });
    const response = await GET(request, context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Start date must be before end date');
  });

  it('returns 400 for invalid range parameter', async () => {
    mockGetTokenBySlug.mockResolvedValue(mockToken);

    const [request, context] = createRequest('bitcoin', { range: '2w' });
    const response = await GET(request, context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Invalid range');
  });

  it('returns 500 on internal error', async () => {
    mockGetTokenBySlug.mockRejectedValue(new Error('DB error'));

    const [request, context] = createRequest('bitcoin');
    const response = await GET(request, context);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to fetch snapshots');
  });
});
