import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetResearchStatus } = vi.hoisted(() => ({
  mockGetResearchStatus: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createRequestLogger: () => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  }),
}));

vi.mock('@/lib/queries/research', () => ({
  getResearchStatus: (...args: unknown[]) => mockGetResearchStatus(...args),
}));

import { GET } from '@/app/api/research/[id]/status/route';

describe('GET /api/research/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns status on success', async () => {
    mockGetResearchStatus.mockResolvedValue({
      id: 'res1', status: 'RUNNING', importanceScore: 50, updatedAt: new Date('2024-02-01'),
    });
    const res = await GET(
      new Request('http://localhost:3000/api/research/res1/status'),
      { params: Promise.resolve({ id: 'res1' }) }
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.status).toBe('RUNNING');
  });

  it('returns 404 when not found', async () => {
    mockGetResearchStatus.mockResolvedValue(null);
    const res = await GET(
      new Request('http://localhost:3000/api/research/nonexistent/status'),
      { params: Promise.resolve({ id: 'nonexistent' }) }
    );
    expect(res.status).toBe(404);
  });

  it('returns 500 on error', async () => {
    mockGetResearchStatus.mockRejectedValue(new Error('DB error'));
    const res = await GET(
      new Request('http://localhost:3000/api/research/res1/status'),
      { params: Promise.resolve({ id: 'res1' }) }
    );
    expect(res.status).toBe(500);
  });
});
