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
  getCategories: vi.fn(),
}));

import { GET } from '@/app/api/categories/route';
import { getCategories } from '@/lib/queries/tokens';

const mockGetCategories = vi.mocked(getCategories);

function createRequest(): Request {
  return new Request('http://localhost:3000/api/categories');
}

describe('GET /api/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns categories with counts', async () => {
    mockGetCategories.mockResolvedValue([
      { name: 'Layer 1', count: 50 },
      { name: 'DeFi', count: 30 },
      { name: 'Meme', count: 10 },
    ]);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(3);
    expect(body.data[0]).toEqual({ name: 'Layer 1', count: 50 });
  });

  it('returns empty array when no categories', async () => {
    mockGetCategories.mockResolvedValue([]);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it('returns 500 on failure', async () => {
    mockGetCategories.mockRejectedValue(new Error('DB error'));

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to fetch categories');
  });
});
