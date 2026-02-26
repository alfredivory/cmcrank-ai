import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockRequireAuth,
  mockGetSession,
  mockResearchFindUnique,
  mockGetComments,
  mockCreateComment,
  mockParentFindUnique,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockGetSession: vi.fn(),
  mockResearchFindUnique: vi.fn(),
  mockGetComments: vi.fn(),
  mockCreateComment: vi.fn(),
  mockParentFindUnique: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createRequestLogger: () => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  }),
}));

vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: () => mockRequireAuth(),
  getSession: () => mockGetSession(),
  isAuthError: (r: unknown) => r instanceof Response,
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    research: { findUnique: (...args: unknown[]) => mockResearchFindUnique(...args) },
    researchComment: { findUnique: (...args: unknown[]) => mockParentFindUnique(...args) },
  },
}));

vi.mock('@/lib/queries/comments', () => ({
  getCommentsForResearch: (...args: unknown[]) => mockGetComments(...args),
  createComment: (...args: unknown[]) => mockCreateComment(...args),
}));

vi.mock('@/lib/sanitize', () => ({
  sanitizeCommentContent: (s: string) => s.trim(),
  sanitizeCitedText: (s: string) => s.trim(),
}));

import { GET, POST } from '@/app/api/research/[id]/comments/route';

const allowlistedUser = {
  id: 'user1', role: 'USER', isAllowlisted: true,
  name: 'Test', email: 'test@test.com', image: null, creditsRemaining: 5, dailyCreditLimit: 10,
};

function makeReq(body?: Record<string, unknown>) {
  const init: RequestInit = { method: body ? 'POST' : 'GET' };
  if (body) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  return new Request('http://localhost/api/research/res1/comments', init);
}

const params = Promise.resolve({ id: 'res1' });

describe('GET /api/research/[id]/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
    mockResearchFindUnique.mockResolvedValue({ id: 'res1', version: 1 });
    mockGetComments.mockResolvedValue([]);
  });

  it('returns comments publicly without auth', async () => {
    const res = await GET(makeReq(), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('returns 404 for non-existent research', async () => {
    mockResearchFindUnique.mockResolvedValue(null);
    const res = await GET(makeReq(), { params });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/research/[id]/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue(allowlistedUser);
    mockResearchFindUnique.mockResolvedValue({ id: 'res1', version: 1, status: 'COMPLETE' });
    mockCreateComment.mockResolvedValue({ id: 'c1' });
  });

  it('creates a comment on success', async () => {
    const res = await POST(
      makeReq({ content: 'Great research!' }),
      { params }
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe('c1');
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    );
    const res = await POST(makeReq({ content: 'test' }), { params });
    expect(res.status).toBe(401);
  });

  it('returns 403 when not allowlisted', async () => {
    mockRequireAuth.mockResolvedValue({ ...allowlistedUser, isAllowlisted: false });
    const res = await POST(makeReq({ content: 'test' }), { params });
    expect(res.status).toBe(403);
  });

  it('returns 400 for empty content', async () => {
    const res = await POST(makeReq({ content: '' }), { params });
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-string content', async () => {
    const res = await POST(makeReq({ content: 123 }), { params });
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent research', async () => {
    mockResearchFindUnique.mockResolvedValue(null);
    const res = await POST(makeReq({ content: 'test' }), { params });
    expect(res.status).toBe(404);
  });

  it('returns 400 for non-COMPLETE research', async () => {
    mockResearchFindUnique.mockResolvedValue({ id: 'res1', version: 1, status: 'RUNNING' });
    const res = await POST(makeReq({ content: 'test' }), { params });
    expect(res.status).toBe(400);
  });

  it('validates parent comment belongs to same research', async () => {
    mockParentFindUnique.mockResolvedValue({ researchId: 'other-research' });
    const res = await POST(
      makeReq({ content: 'test', parentCommentId: 'wrong-parent' }),
      { params }
    );
    expect(res.status).toBe(400);
  });
});
