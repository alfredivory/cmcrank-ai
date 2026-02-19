import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockRequireAuth,
  mockConsumeCredit,
  mockFindOverlapping,
  mockExecuteResearch,
  mockTokenFindUnique,
  mockResearchCreate,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockConsumeCredit: vi.fn(),
  mockFindOverlapping: vi.fn(),
  mockExecuteResearch: vi.fn(),
  mockTokenFindUnique: vi.fn(),
  mockResearchCreate: vi.fn(),
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

vi.mock('@/lib/auth/credits', () => ({
  consumeCredit: (...args: unknown[]) => mockConsumeCredit(...args),
}));

vi.mock('@/lib/queries/research', () => ({
  findOverlappingResearch: (...args: unknown[]) => mockFindOverlapping(...args),
}));

vi.mock('@/lib/ai/execute', () => ({
  executeResearch: (...args: unknown[]) => mockExecuteResearch(...args),
}));

vi.mock('@/lib/sanitize', () => ({
  sanitizeUserContext: (s: string) => s.trim(),
  validateDateRange: () => ({ valid: true }),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    token: { findUnique: (...args: unknown[]) => mockTokenFindUnique(...args) },
    research: { create: (...args: unknown[]) => mockResearchCreate(...args) },
  },
}));

import { POST } from '@/app/api/research/trigger/route';

const allowlistedUser = {
  id: 'user1', role: 'USER', isAllowlisted: true,
  name: 'Test', email: 'test@test.com', image: null, creditsRemaining: 5,
};

function makeReq(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/research/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/research/trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue(allowlistedUser);
    mockTokenFindUnique.mockResolvedValue({ id: 'token1', name: 'Bitcoin' });
    mockFindOverlapping.mockResolvedValue(null);
    mockConsumeCredit.mockResolvedValue({ success: true, remaining: 4 });
    mockResearchCreate.mockResolvedValue({ id: 'res1', status: 'PENDING' });
    mockExecuteResearch.mockResolvedValue(undefined);
  });

  it('returns 201 with research ID on success', async () => {
    const res = await POST(makeReq({
      tokenId: 'token1',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    }));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.researchId).toBe('res1');
    expect(body.data.status).toBe('PENDING');
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    );
    const res = await POST(makeReq({
      tokenId: 'token1', startDate: '2024-01-01', endDate: '2024-01-31',
    }));
    expect(res.status).toBe(401);
  });

  it('returns 403 when not allowlisted', async () => {
    mockRequireAuth.mockResolvedValue({ ...allowlistedUser, isAllowlisted: false });
    const res = await POST(makeReq({
      tokenId: 'token1', startDate: '2024-01-01', endDate: '2024-01-31',
    }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when missing required fields', async () => {
    const res = await POST(makeReq({ tokenId: 'token1' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when token not found', async () => {
    mockTokenFindUnique.mockResolvedValue(null);
    const res = await POST(makeReq({
      tokenId: 'nonexistent', startDate: '2024-01-01', endDate: '2024-01-31',
    }));
    expect(res.status).toBe(404);
  });

  it('returns existing research on dedup match', async () => {
    mockFindOverlapping.mockResolvedValue({ id: 'existing1' });
    const res = await POST(makeReq({
      tokenId: 'token1', startDate: '2024-01-01', endDate: '2024-01-31',
    }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.status).toBe('EXISTING');
    expect(body.data.existingResearchId).toBe('existing1');
  });

  it('returns 429 when no credits remaining', async () => {
    mockConsumeCredit.mockResolvedValue({ success: false, remaining: 0 });
    const res = await POST(makeReq({
      tokenId: 'token1', startDate: '2024-01-01', endDate: '2024-01-31',
    }));
    expect(res.status).toBe(429);
  });

  it('fires executeResearch and does not await it', async () => {
    const res = await POST(makeReq({
      tokenId: 'token1', startDate: '2024-01-01', endDate: '2024-01-31',
    }));
    expect(res.status).toBe(201);
    expect(mockExecuteResearch).toHaveBeenCalledWith('res1');
  });
});
