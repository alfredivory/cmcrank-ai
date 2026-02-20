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
    accessRequest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    allowlistEntry: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
}));

const mockRequireAdminDual = vi.fn();
vi.mock('@/lib/auth/helpers', () => ({
  requireAdminDual: (...args: unknown[]) => mockRequireAdminDual(...args),
  isAuthError: (result: unknown) => result instanceof Response,
}));

import { GET, PATCH } from '@/app/api/admin/access-requests/route';
import { prisma } from '@/lib/db';

const adminUser = {
  id: 'admin-1', role: 'ADMIN' as const, isAllowlisted: true,
  name: 'Admin', email: 'admin@test.com', image: null, creditsRemaining: -1, dailyCreditLimit: -1,
};

describe('GET /api/admin/access-requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminDual.mockResolvedValue(adminUser);
  });

  it('returns access requests', async () => {
    vi.mocked(prisma.accessRequest.findMany).mockResolvedValue([
      { id: 'r1', email: 'user@test.com', status: 'PENDING', createdAt: new Date(), user: { name: 'User', image: null } },
    ] as never);

    const res = await GET(new Request('http://localhost:3000/api/admin/access-requests'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it('filters by status', async () => {
    vi.mocked(prisma.accessRequest.findMany).mockResolvedValue([] as never);

    await GET(new Request('http://localhost:3000/api/admin/access-requests?status=PENDING'));
    expect(prisma.accessRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PENDING' } })
    );
  });
});

describe('PATCH /api/admin/access-requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminDual.mockResolvedValue(adminUser);
  });

  it('approves a request', async () => {
    vi.mocked(prisma.accessRequest.findUnique).mockResolvedValue({
      id: 'r1', userId: 'u1', email: 'user@test.com', status: 'PENDING',
    } as never);
    vi.mocked(prisma.accessRequest.update).mockResolvedValue({} as never);
    vi.mocked(prisma.allowlistEntry.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.allowlistEntry.create).mockResolvedValue({} as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const res = await PATCH(new Request('http://localhost:3000/api/admin/access-requests', {
      method: 'PATCH',
      body: JSON.stringify({ requestId: 'r1', action: 'approve' }),
    }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.status).toBe('APPROVED');
  });

  it('denies a request', async () => {
    vi.mocked(prisma.accessRequest.findUnique).mockResolvedValue({
      id: 'r1', userId: 'u1', email: 'user@test.com', status: 'PENDING',
    } as never);
    vi.mocked(prisma.accessRequest.update).mockResolvedValue({} as never);

    const res = await PATCH(new Request('http://localhost:3000/api/admin/access-requests', {
      method: 'PATCH',
      body: JSON.stringify({ requestId: 'r1', action: 'deny' }),
    }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.status).toBe('DENIED');
  });

  it('rejects already processed request', async () => {
    vi.mocked(prisma.accessRequest.findUnique).mockResolvedValue({
      id: 'r1', status: 'APPROVED',
    } as never);

    const res = await PATCH(new Request('http://localhost:3000/api/admin/access-requests', {
      method: 'PATCH',
      body: JSON.stringify({ requestId: 'r1', action: 'approve' }),
    }));
    expect(res.status).toBe(400);
  });
});
