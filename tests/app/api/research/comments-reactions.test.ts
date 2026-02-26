import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockRequireAuth,
  mockCommentFindUnique,
  mockToggleReaction,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockCommentFindUnique: vi.fn(),
  mockToggleReaction: vi.fn(),
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
    researchComment: {
      findUnique: (...args: unknown[]) => mockCommentFindUnique(...args),
    },
  },
}));

vi.mock('@/lib/queries/comments', () => ({
  toggleReaction: (...args: unknown[]) => mockToggleReaction(...args),
}));

import { POST } from '@/app/api/research/[id]/comments/[commentId]/reactions/route';

const allowlistedUser = {
  id: 'user1', role: 'USER', isAllowlisted: true,
  name: 'Test', email: 'test@test.com', image: null, creditsRemaining: 5, dailyCreditLimit: 10,
};

function makeReq(body: Record<string, unknown>) {
  return new Request('http://localhost/api/research/res1/comments/c1/reactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: 'res1', commentId: 'c1' });

describe('POST /api/research/[id]/comments/[commentId]/reactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue(allowlistedUser);
    mockCommentFindUnique.mockResolvedValue({ researchId: 'res1' });
    mockToggleReaction.mockResolvedValue(true);
  });

  it('toggles reaction and returns result', async () => {
    const res = await POST(makeReq({ type: 'UPVOTE' }), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.added).toBe(true);
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    );
    const res = await POST(makeReq({ type: 'UPVOTE' }), { params });
    expect(res.status).toBe(401);
  });

  it('returns 403 when not allowlisted', async () => {
    mockRequireAuth.mockResolvedValue({ ...allowlistedUser, isAllowlisted: false });
    const res = await POST(makeReq({ type: 'UPVOTE' }), { params });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid reaction type', async () => {
    const res = await POST(makeReq({ type: 'INVALID' }), { params });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing type', async () => {
    const res = await POST(makeReq({}), { params });
    expect(res.status).toBe(400);
  });

  it('returns 404 when comment not in this research', async () => {
    mockCommentFindUnique.mockResolvedValue({ researchId: 'other-research' });
    const res = await POST(makeReq({ type: 'UPVOTE' }), { params });
    expect(res.status).toBe(404);
  });

  it('returns 404 when comment not found', async () => {
    mockCommentFindUnique.mockResolvedValue(null);
    const res = await POST(makeReq({ type: 'UPVOTE' }), { params });
    expect(res.status).toBe(404);
  });

  it('accepts all valid reaction types', async () => {
    for (const type of ['UPVOTE', 'DOWNVOTE', 'FIRE', 'LIGHTBULB', 'THINKING', 'HUNDRED']) {
      const res = await POST(makeReq({ type }), { params });
      expect(res.status).toBe(200);
    }
  });
});
