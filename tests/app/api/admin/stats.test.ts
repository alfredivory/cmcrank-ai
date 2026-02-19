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
    user: {
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    accessRequest: {
      count: vi.fn(),
    },
  },
}));

const mockRequireAdminDual = vi.fn();
vi.mock('@/lib/auth/helpers', () => ({
  requireAdminDual: (...args: unknown[]) => mockRequireAdminDual(...args),
  isAuthError: (result: unknown) => result instanceof Response,
}));

import { GET } from '@/app/api/admin/stats/route';
import { prisma } from '@/lib/db';

const adminUser = {
  id: 'admin-1', role: 'ADMIN' as const, isAllowlisted: true,
  name: 'Admin', email: 'admin@test.com', image: null, creditsRemaining: 5,
};

describe('GET /api/admin/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminDual.mockResolvedValue(adminUser);
  });

  it('returns stats', async () => {
    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(10 as never) // totalUsers
      .mockResolvedValueOnce(5 as never); // allowlistedUsers
    vi.mocked(prisma.accessRequest.count).mockResolvedValue(2 as never);
    vi.mocked(prisma.user.aggregate).mockResolvedValue({
      _sum: { researchCreditsUsed: 7 },
    } as never);

    const res = await GET(new Request('http://localhost:3000/api/admin/stats'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({
      totalUsers: 10,
      allowlistedUsers: 5,
      pendingRequests: 2,
      creditsConsumedToday: 7,
    });
  });

  it('returns 401 when unauthorized', async () => {
    mockRequireAdminDual.mockResolvedValue(new Response('Unauthorized', { status: 401 }));

    const res = await GET(new Request('http://localhost:3000/api/admin/stats'));
    expect(res.status).toBe(401);
  });
});
