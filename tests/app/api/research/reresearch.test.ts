import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockRequireAuth,
  mockResearchFindUnique,
  mockResearchFindFirst,
  mockExecuteReresearch,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockResearchFindUnique: vi.fn(),
  mockResearchFindFirst: vi.fn(),
  mockExecuteReresearch: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createRequestLogger: () => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  }),
}));

vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: () => mockRequireAuth(),
  isAuthError: (r: unknown) => r instanceof Response,
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    research: {
      findUnique: (...args: unknown[]) => mockResearchFindUnique(...args),
      findFirst: (...args: unknown[]) => mockResearchFindFirst(...args),
    },
  },
}));

vi.mock('@/lib/ai/reresearch', () => ({
  executeReresearch: (...args: unknown[]) => mockExecuteReresearch(...args),
}));

import { POST } from '@/app/api/research/[id]/reresearch/route';

const allowlistedUser = {
  id: 'user1', role: 'USER', isAllowlisted: true,
  name: 'Test', email: 'test@test.com', image: null, creditsRemaining: 5, dailyCreditLimit: 10,
};

const params = Promise.resolve({ id: 'res1' });

function makeReq() {
  return new Request('http://localhost/api/research/res1/reresearch', {
    method: 'POST',
  });
}

describe('POST /api/research/[id]/reresearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue(allowlistedUser);
    mockResearchFindUnique.mockResolvedValue({ id: 'res1', status: 'COMPLETE', tokenId: 'token1' });
    mockResearchFindFirst.mockResolvedValue(null);
    mockExecuteReresearch.mockResolvedValue({ researchId: 'res2' });
  });

  it('triggers re-research and returns 201', async () => {
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.researchId).toBe('res2');
    expect(body.data.status).toBe('PENDING');
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    );
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(401);
  });

  it('returns 403 when not allowlisted', async () => {
    mockRequireAuth.mockResolvedValue({ ...allowlistedUser, isAllowlisted: false });
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent research', async () => {
    mockResearchFindUnique.mockResolvedValue(null);
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(404);
  });

  it('returns 400 for non-COMPLETE research', async () => {
    mockResearchFindUnique.mockResolvedValue({ id: 'res1', status: 'RUNNING', tokenId: 'token1' });
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(400);
  });

  it('returns 409 when re-research already pending', async () => {
    mockResearchFindFirst.mockResolvedValue({ id: 'res-pending' });
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(409);
  });
});
