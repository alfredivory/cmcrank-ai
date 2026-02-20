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
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

const mockRequireAdminDual = vi.fn();
vi.mock('@/lib/auth/helpers', () => ({
  requireAdminDual: (...args: unknown[]) => mockRequireAdminDual(...args),
  isAuthError: (result: unknown) => result instanceof Response,
}));

vi.mock('@/lib/auth/allowlist', () => ({
  isEmailAllowlisted: vi.fn().mockResolvedValue(false),
}));

import { GET, PATCH } from '@/app/api/admin/users/route';
import { prisma } from '@/lib/db';

const mockFindMany = vi.mocked(prisma.user.findMany);
const mockUpdate = vi.mocked(prisma.user.update);
const mockCount = vi.mocked(prisma.user.count);
const mockFindUnique = vi.mocked(prisma.user.findUnique);

const adminUser = {
  id: 'admin-1',
  name: 'Admin',
  email: 'admin@test.com',
  role: 'ADMIN' as const,
  isAllowlisted: true,
  creditsRemaining: -1,
  dailyCreditLimit: -1,
  image: null,
};

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminDual.mockResolvedValue(adminUser);
  });

  it('returns 401 when not authorized', async () => {
    mockRequireAdminDual.mockResolvedValue(new Response('Unauthorized', { status: 401 }));
    const req = new Request('http://localhost:3000/api/admin/users');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns users list', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'u1', name: 'User', email: 'user@test.com', image: null, role: 'USER', isAllowlisted: false, dailyCreditLimit: null, createdAt: new Date() },
    ] as never);

    const req = new Request('http://localhost:3000/api/admin/users');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it('filters by search query', async () => {
    mockFindMany.mockResolvedValue([] as never);

    const req = new Request('http://localhost:3000/api/admin/users?search=test');
    await GET(req);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ email: expect.objectContaining({ contains: 'test' }) }),
          ]),
        }),
      })
    );
  });
});

describe('PATCH /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminDual.mockResolvedValue(adminUser);
  });

  it('updates user role', async () => {
    mockUpdate.mockResolvedValue({ id: 'u2', role: 'ADMIN', email: 'user@test.com', dailyCreditLimit: null } as never);

    const req = new Request('http://localhost:3000/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: 'u2', role: 'ADMIN' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
  });

  it('prevents self-demotion', async () => {
    const req = new Request('http://localhost:3000/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: 'admin-1', role: 'USER' }),
    });
    const res = await PATCH(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain('Cannot demote yourself');
  });

  it('prevents removing last admin', async () => {
    mockCount.mockResolvedValue(1 as never);
    mockFindUnique.mockResolvedValue({ id: 'u2', role: 'ADMIN' } as never);

    const req = new Request('http://localhost:3000/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: 'u2', role: 'USER' }),
    });
    const res = await PATCH(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain('last admin');
  });

  it('rejects invalid role', async () => {
    const req = new Request('http://localhost:3000/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: 'u2', role: 'SUPERADMIN' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it('updates dailyCreditLimit', async () => {
    mockUpdate.mockResolvedValue({ id: 'u2', role: 'USER', email: 'user@test.com', dailyCreditLimit: 20 } as never);

    const req = new Request('http://localhost:3000/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: 'u2', dailyCreditLimit: 20 }),
    });
    const res = await PATCH(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.dailyCreditLimit).toBe(20);
  });

  it('resets dailyCreditLimit to default with null', async () => {
    mockUpdate.mockResolvedValue({ id: 'u2', role: 'USER', email: 'user@test.com', dailyCreditLimit: null } as never);

    const req = new Request('http://localhost:3000/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: 'u2', dailyCreditLimit: null }),
    });
    const res = await PATCH(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.dailyCreditLimit).toBeNull();
  });

  it('rejects negative dailyCreditLimit', async () => {
    const req = new Request('http://localhost:3000/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: 'u2', dailyCreditLimit: -5 }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it('rejects when no update fields provided', async () => {
    const req = new Request('http://localhost:3000/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: 'u2' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it('sets allowlistOverride to FORCE_YES and updates isAllowlisted', async () => {
    mockUpdate.mockResolvedValue({ id: 'u2', role: 'USER', email: 'user@test.com', isAllowlisted: true, allowlistOverride: 'FORCE_YES', dailyCreditLimit: null } as never);

    const req = new Request('http://localhost:3000/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: 'u2', allowlistOverride: 'FORCE_YES' }),
    });
    const res = await PATCH(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.isAllowlisted).toBe(true);
    expect(body.data.allowlistOverride).toBe('FORCE_YES');
  });

  it('sets allowlistOverride to FORCE_NO and updates isAllowlisted', async () => {
    mockUpdate.mockResolvedValue({ id: 'u2', role: 'USER', email: 'user@test.com', isAllowlisted: false, allowlistOverride: 'FORCE_NO', dailyCreditLimit: null } as never);

    const req = new Request('http://localhost:3000/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: 'u2', allowlistOverride: 'FORCE_NO' }),
    });
    const res = await PATCH(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.isAllowlisted).toBe(false);
    expect(body.data.allowlistOverride).toBe('FORCE_NO');
  });

  it('resets allowlistOverride to null and re-checks patterns', async () => {
    mockFindUnique.mockResolvedValue({ email: 'user@test.com' } as never);
    mockUpdate.mockResolvedValue({ id: 'u2', role: 'USER', email: 'user@test.com', isAllowlisted: false, allowlistOverride: null, dailyCreditLimit: null } as never);

    const req = new Request('http://localhost:3000/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: 'u2', allowlistOverride: null }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
  });
});
