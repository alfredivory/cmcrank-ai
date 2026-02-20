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
  getTokensBySlugs: vi.fn(),
  getSnapshotHistory: vi.fn(),
}));

import { GET } from '@/app/api/compare/route';
import { getTokensBySlugs, getSnapshotHistory } from '@/lib/queries/tokens';

const mockGetTokensBySlugs = vi.mocked(getTokensBySlugs);
const mockGetSnapshotHistory = vi.mocked(getSnapshotHistory);

const mockTokens = [
  { id: 'token-1', name: 'Bitcoin', symbol: 'BTC', slug: 'bitcoin', logoUrl: null, currentRank: 1 },
  { id: 'token-2', name: 'Ethereum', symbol: 'ETH', slug: 'ethereum', logoUrl: null, currentRank: 2 },
];

const mockSnapshots = [
  { date: '2026-01-19', rank: 1, marketCap: 1e12, price: 50000, volume24h: 30e9, circulatingSupply: 19e6 },
  { date: '2026-02-18', rank: 2, marketCap: 900e9, price: 45000, volume24h: 25e9, circulatingSupply: 19e6 },
];

function createRequest(params?: Record<string, string>): Request {
  const url = new URL('http://localhost:3000/api/compare');
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return new Request(url.toString());
}

describe('GET /api/compare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns comparison data for multiple tokens', async () => {
    mockGetTokensBySlugs.mockResolvedValue(mockTokens);
    mockGetSnapshotHistory.mockResolvedValue(mockSnapshots);

    const request = createRequest({ tokens: 'bitcoin,ethereum' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.tokens).toHaveLength(2);
    expect(body.data.tokens[0].token.slug).toBe('bitcoin');
    expect(body.data.tokens[1].token.slug).toBe('ethereum');
    expect(body.data.tokens[0].snapshots).toHaveLength(2);
    expect(body.data.range).toBe('30d');
    expect(mockGetSnapshotHistory).toHaveBeenCalledTimes(2);
  });

  it('uses specified range', async () => {
    mockGetTokensBySlugs.mockResolvedValue([mockTokens[0]]);
    mockGetSnapshotHistory.mockResolvedValue(mockSnapshots);

    const request = createRequest({ tokens: 'bitcoin', range: '7d' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.range).toBe('7d');
    expect(mockGetSnapshotHistory).toHaveBeenCalledWith('token-1', '7d', undefined, undefined);
  });

  it('supports custom date range', async () => {
    mockGetTokensBySlugs.mockResolvedValue([mockTokens[0]]);
    mockGetSnapshotHistory.mockResolvedValue(mockSnapshots);

    const request = createRequest({ tokens: 'bitcoin', start: '2025-01-01', end: '2025-06-30' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.range).toBe('custom');
    expect(mockGetSnapshotHistory).toHaveBeenCalledWith(
      'token-1',
      'all',
      new Date('2025-01-01'),
      new Date('2025-06-30')
    );
  });

  it('returns 400 when tokens param is missing', async () => {
    const request = createRequest();
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Missing tokens parameter');
  });

  it('returns 400 for empty tokens param', async () => {
    const request = createRequest({ tokens: ',,' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('No valid token slugs provided');
  });

  it('returns 400 when exceeding max tokens', async () => {
    const request = createRequest({ tokens: 'a,b,c,d,e,f' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Maximum 5 tokens');
  });

  it('returns 404 when no tokens found', async () => {
    mockGetTokensBySlugs.mockResolvedValue([]);

    const request = createRequest({ tokens: 'nonexistent' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('No matching tokens found');
  });

  it('returns 400 for invalid date format', async () => {
    mockGetTokensBySlugs.mockResolvedValue([mockTokens[0]]);

    const request = createRequest({ tokens: 'bitcoin', start: 'bad', end: '2025-06-30' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Invalid date format');
  });

  it('returns 400 when start date is after end date', async () => {
    mockGetTokensBySlugs.mockResolvedValue([mockTokens[0]]);

    const request = createRequest({ tokens: 'bitcoin', start: '2025-06-30', end: '2025-01-01' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Start date must be before end date');
  });

  it('returns 400 for invalid range', async () => {
    mockGetTokensBySlugs.mockResolvedValue([mockTokens[0]]);

    const request = createRequest({ tokens: 'bitcoin', range: '2w' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Invalid range');
  });

  it('returns 500 on internal error', async () => {
    mockGetTokensBySlugs.mockRejectedValue(new Error('DB error'));

    const request = createRequest({ tokens: 'bitcoin' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to fetch comparison data');
  });
});
