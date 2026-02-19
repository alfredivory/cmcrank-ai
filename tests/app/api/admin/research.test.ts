import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  createRequestLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    research: {
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockRequireAdminDual = vi.fn();
vi.mock('@/lib/auth/helpers', () => ({
  requireAdminDual: (...args: unknown[]) => mockRequireAdminDual(...args),
  isAuthError: (result: unknown) => result instanceof Response,
}));

import { GET, PATCH } from '@/app/api/admin/research/route';
import { prisma } from '@/lib/db';

const mockFindMany = vi.mocked(prisma.research.findMany);
const mockCount = vi.mocked(prisma.research.count);
const mockUpdate = vi.mocked(prisma.research.update);

const adminUser = {
  id: 'admin-1',
  name: 'Admin',
  email: 'admin@test.com',
  role: 'ADMIN' as const,
  isAllowlisted: true,
  creditsRemaining: 5,
  image: null,
};

const sampleResearchItem = {
  id: 'res1',
  tokenId: 'token1',
  dateRangeStart: new Date('2024-01-01'),
  dateRangeEnd: new Date('2024-01-31'),
  status: 'COMPLETE',
  importanceScore: 75,
  isVisible: true,
  createdAt: new Date(),
  token: { name: 'Bitcoin', symbol: 'BTC', slug: 'bitcoin' },
  triggeredBy: { name: 'User', email: 'user@test.com' },
  feedback: [
    { rating: 'THUMBS_UP' },
    { rating: 'THUMBS_UP' },
    { rating: 'THUMBS_DOWN' },
  ],
};

describe('GET /api/admin/research', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminDual.mockResolvedValue(adminUser);
  });

  it('returns 401 for unauthenticated request', async () => {
    mockRequireAdminDual.mockResolvedValue(new Response('Unauthorized', { status: 401 }));
    const res = await GET(new Request('http://localhost:3000/api/admin/research'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    mockRequireAdminDual.mockResolvedValue(new Response('Forbidden', { status: 403 }));
    const res = await GET(new Request('http://localhost:3000/api/admin/research'));
    expect(res.status).toBe(403);
  });

  it('returns research list with feedback counts', async () => {
    mockFindMany.mockResolvedValue([sampleResearchItem] as never);
    mockCount.mockResolvedValue(1);

    const res = await GET(new Request('http://localhost:3000/api/admin/research'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].feedback).toEqual({ thumbsUp: 2, thumbsDown: 1 });
    expect(body.data.pagination.total).toBe(1);
  });

  it('filters by search term', async () => {
    mockFindMany.mockResolvedValue([] as never);
    mockCount.mockResolvedValue(0);

    await GET(new Request('http://localhost:3000/api/admin/research?search=bitcoin'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          token: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.objectContaining({ contains: 'bitcoin' }) }),
            ]),
          }),
        }),
      })
    );
  });

  it('filters by status', async () => {
    mockFindMany.mockResolvedValue([] as never);
    mockCount.mockResolvedValue(0);

    await GET(new Request('http://localhost:3000/api/admin/research?status=COMPLETE'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'COMPLETE' }),
      })
    );
  });

  it('filters by visibility', async () => {
    mockFindMany.mockResolvedValue([] as never);
    mockCount.mockResolvedValue(0);

    await GET(new Request('http://localhost:3000/api/admin/research?visibility=hidden'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isVisible: false }),
      })
    );
  });
});

describe('PATCH /api/admin/research', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminDual.mockResolvedValue(adminUser);
  });

  it('returns 400 for missing researchId', async () => {
    const res = await PATCH(
      new Request('http://localhost:3000/api/admin/research', {
        method: 'PATCH',
        body: JSON.stringify({ isVisible: false }),
      })
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain('researchId');
  });

  it('returns 400 for non-boolean isVisible', async () => {
    const res = await PATCH(
      new Request('http://localhost:3000/api/admin/research', {
        method: 'PATCH',
        body: JSON.stringify({ researchId: 'res1', isVisible: 'yes' }),
      })
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain('boolean');
  });

  it('toggles visibility and returns updated record', async () => {
    mockUpdate.mockResolvedValue({ id: 'res1', isVisible: false, status: 'COMPLETE' } as never);

    const res = await PATCH(
      new Request('http://localhost:3000/api/admin/research', {
        method: 'PATCH',
        body: JSON.stringify({ researchId: 'res1', isVisible: false }),
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.isVisible).toBe(false);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'res1' },
      data: { isVisible: false },
      select: { id: true, isVisible: true, status: true },
    });
  });
});
