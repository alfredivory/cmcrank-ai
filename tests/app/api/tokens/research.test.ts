import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetTokenBySlug, mockGetResearchForToken } = vi.hoisted(() => ({
  mockGetTokenBySlug: vi.fn(),
  mockGetResearchForToken: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createRequestLogger: () => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  }),
}));

vi.mock('@/lib/queries/tokens', () => ({
  getTokenBySlug: (...args: unknown[]) => mockGetTokenBySlug(...args),
}));

vi.mock('@/lib/queries/research', () => ({
  getResearchForToken: (...args: unknown[]) => mockGetResearchForToken(...args),
}));

import { GET } from '@/app/api/tokens/[slug]/research/route';

describe('GET /api/tokens/[slug]/research', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTokenBySlug.mockResolvedValue({ id: 'token1', slug: 'bitcoin' });
  });

  it('returns research list for token', async () => {
    mockGetResearchForToken.mockResolvedValue({
      items: [
        {
          id: 'res1',
          dateRangeStart: new Date('2024-01-01'),
          dateRangeEnd: new Date('2024-01-31'),
          status: 'COMPLETE',
          importanceScore: 80,
          createdAt: new Date('2024-02-01'),
          updatedAt: new Date('2024-02-01'),
        },
      ],
      total: 1,
    });

    const res = await GET(
      new Request('http://localhost:3000/api/tokens/bitcoin/research'),
      { params: Promise.resolve({ slug: 'bitcoin' }) }
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].id).toBe('res1');
    expect(body.data.pagination.total).toBe(1);
  });

  it('returns 404 when token not found', async () => {
    mockGetTokenBySlug.mockResolvedValue(null);
    const res = await GET(
      new Request('http://localhost:3000/api/tokens/nonexistent/research'),
      { params: Promise.resolve({ slug: 'nonexistent' }) }
    );
    expect(res.status).toBe(404);
  });

  it('respects pagination params', async () => {
    mockGetResearchForToken.mockResolvedValue({ items: [], total: 0 });
    await GET(
      new Request('http://localhost:3000/api/tokens/bitcoin/research?limit=5&offset=10'),
      { params: Promise.resolve({ slug: 'bitcoin' }) }
    );
    expect(mockGetResearchForToken).toHaveBeenCalledWith('token1', { limit: 5, offset: 10 });
  });

  it('returns 500 on error', async () => {
    mockGetResearchForToken.mockRejectedValue(new Error('DB error'));
    const res = await GET(
      new Request('http://localhost:3000/api/tokens/bitcoin/research'),
      { params: Promise.resolve({ slug: 'bitcoin' }) }
    );
    expect(res.status).toBe(500);
  });
});
