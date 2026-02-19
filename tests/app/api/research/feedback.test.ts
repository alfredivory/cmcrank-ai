import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockRequireAuth,
  mockResearchFindUnique,
  mockFeedbackUpsert,
  mockFeedbackFindUnique,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockResearchFindUnique: vi.fn(),
  mockFeedbackUpsert: vi.fn(),
  mockFeedbackFindUnique: vi.fn(),
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
    research: { findUnique: (...args: unknown[]) => mockResearchFindUnique(...args) },
    researchFeedback: {
      upsert: (...args: unknown[]) => mockFeedbackUpsert(...args),
      findUnique: (...args: unknown[]) => mockFeedbackFindUnique(...args),
    },
  },
}));

import { POST, GET } from '@/app/api/research/[id]/feedback/route';

const authUser = {
  id: 'user1', role: 'USER', isAllowlisted: true,
  name: 'Test', email: 'test@test.com', image: null, creditsRemaining: 5,
};

function makePostReq(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/research/res1/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeGetReq() {
  return new Request('http://localhost:3000/api/research/res1/feedback');
}

const params = Promise.resolve({ id: 'res1' });

describe('POST /api/research/[id]/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue(authUser);
    mockResearchFindUnique.mockResolvedValue({ id: 'res1' });
    mockFeedbackUpsert.mockResolvedValue({
      id: 'fb1', researchId: 'res1', userId: 'user1', rating: 'THUMBS_UP', comment: null,
    });
  });

  it('submits feedback successfully', async () => {
    const res = await POST(makePostReq({ rating: 'THUMBS_UP' }), { params });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.rating).toBe('THUMBS_UP');
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    );
    const res = await POST(makePostReq({ rating: 'THUMBS_UP' }), { params });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid rating', async () => {
    const res = await POST(makePostReq({ rating: 'INVALID' }), { params });
    expect(res.status).toBe(400);
  });

  it('returns 404 when research not found', async () => {
    mockResearchFindUnique.mockResolvedValue(null);
    const res = await POST(makePostReq({ rating: 'THUMBS_UP' }), { params });
    expect(res.status).toBe(404);
  });

  it('upserts feedback (allows changing rating)', async () => {
    await POST(makePostReq({ rating: 'THUMBS_DOWN', comment: 'Needs improvement' }), { params });
    expect(mockFeedbackUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { researchId_userId: { researchId: 'res1', userId: 'user1' } },
        update: expect.objectContaining({ rating: 'THUMBS_DOWN' }),
        create: expect.objectContaining({ rating: 'THUMBS_DOWN' }),
      })
    );
  });
});

describe('GET /api/research/[id]/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue(authUser);
  });

  it('returns existing feedback', async () => {
    mockFeedbackFindUnique.mockResolvedValue({
      id: 'fb1', rating: 'THUMBS_UP', comment: null,
    });
    const res = await GET(makeGetReq(), { params });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.rating).toBe('THUMBS_UP');
  });

  it('returns null when no feedback exists', async () => {
    mockFeedbackFindUnique.mockResolvedValue(null);
    const res = await GET(makeGetReq(), { params });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toBeNull();
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    );
    const res = await GET(makeGetReq(), { params });
    expect(res.status).toBe(401);
  });
});
