import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetResearchById } = vi.hoisted(() => ({
  mockGetResearchById: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createRequestLogger: () => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  }),
}));

vi.mock('@/lib/queries/research', () => ({
  getResearchById: (...args: unknown[]) => mockGetResearchById(...args),
}));

import { GET } from '@/app/api/research/[id]/route';

const sampleResearch = {
  id: 'res1',
  tokenId: 'token1',
  dateRangeStart: new Date('2024-01-01'),
  dateRangeEnd: new Date('2024-01-31'),
  status: 'COMPLETE',
  content: { executiveSummary: 'Test' },
  renderedMarkdown: '# Test',
  importanceScore: 80,
  userContext: null,
  parentResearchId: null,
  createdAt: new Date('2024-02-01'),
  updatedAt: new Date('2024-02-01'),
  token: { id: 'token1', name: 'Bitcoin', symbol: 'BTC', slug: 'bitcoin', logoUrl: null, cmcId: 1 },
  events: [
    {
      id: 'ev1',
      eventDate: new Date('2024-01-10'),
      eventType: 'REGULATORY',
      title: 'ETF Approved',
      description: 'Test',
      sourceUrl: 'https://example.com',
      importanceScore: 90,
    },
  ],
};

describe('GET /api/research/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns research detail on success', async () => {
    mockGetResearchById.mockResolvedValue(sampleResearch);
    const res = await GET(
      new Request('http://localhost:3000/api/research/res1'),
      { params: Promise.resolve({ id: 'res1' }) }
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.id).toBe('res1');
    expect(body.data.token.name).toBe('Bitcoin');
    expect(body.data.events).toHaveLength(1);
  });

  it('returns 404 when not found', async () => {
    mockGetResearchById.mockResolvedValue(null);
    const res = await GET(
      new Request('http://localhost:3000/api/research/nonexistent'),
      { params: Promise.resolve({ id: 'nonexistent' }) }
    );
    expect(res.status).toBe(404);
  });

  it('serializes dates as strings', async () => {
    mockGetResearchById.mockResolvedValue(sampleResearch);
    const res = await GET(
      new Request('http://localhost:3000/api/research/res1'),
      { params: Promise.resolve({ id: 'res1' }) }
    );
    const body = await res.json();
    expect(body.data.dateRangeStart).toBe('2024-01-01');
    expect(body.data.dateRangeEnd).toBe('2024-01-31');
    expect(body.data.events[0].eventDate).toBe('2024-01-10');
  });

  it('returns 500 on unexpected error', async () => {
    mockGetResearchById.mockRejectedValue(new Error('DB error'));
    const res = await GET(
      new Request('http://localhost:3000/api/research/res1'),
      { params: Promise.resolve({ id: 'res1' }) }
    );
    expect(res.status).toBe(500);
  });
});
