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
    allowlistEntry: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockRequireAdminDual = vi.fn();
vi.mock('@/lib/auth/helpers', () => ({
  requireAdminDual: (...args: unknown[]) => mockRequireAdminDual(...args),
  isAuthError: (result: unknown) => result instanceof Response,
}));

vi.mock('@/lib/auth/allowlist', () => ({
  matchesPattern: vi.fn((email: string, entry: { pattern: string }) => {
    if (entry.pattern === '*@defuse.org') return email.endsWith('@defuse.org');
    return email.toLowerCase() === entry.pattern.toLowerCase();
  }),
}));

import { GET, POST, DELETE } from '@/app/api/admin/allowlist/route';
import { prisma } from '@/lib/db';

const mockFindMany = vi.mocked(prisma.allowlistEntry.findMany);
const mockFindUnique = vi.mocked(prisma.allowlistEntry.findUnique);
const mockCreate = vi.mocked(prisma.allowlistEntry.create);

const adminUser = {
  id: 'admin-1', role: 'ADMIN' as const, isAllowlisted: true,
  name: 'Admin', email: 'admin@test.com', image: null, creditsRemaining: -1, dailyCreditLimit: -1,
};

describe('GET /api/admin/allowlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminDual.mockResolvedValue(adminUser);
  });

  it('returns allowlist entries', async () => {
    mockFindMany.mockResolvedValue([
      { id: '1', pattern: '*@defuse.org', isRegex: false, createdAt: new Date(), createdBy: null },
    ] as never);

    const res = await GET(new Request('http://localhost:3000/api/admin/allowlist'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });
});

describe('POST /api/admin/allowlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminDual.mockResolvedValue(adminUser);
  });

  it('creates a new allowlist entry', async () => {
    mockFindUnique.mockResolvedValue(null as never);
    mockCreate.mockResolvedValue({
      id: '2', pattern: '*@aurora.dev', isRegex: false, createdAt: new Date(), createdBy: 'admin-1',
    } as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);

    const res = await POST(new Request('http://localhost:3000/api/admin/allowlist', {
      method: 'POST',
      body: JSON.stringify({ pattern: '*@aurora.dev' }),
    }));
    expect(res.status).toBe(200);
  });

  it('rejects duplicate pattern', async () => {
    mockFindUnique.mockResolvedValue({ id: '1', pattern: '*@defuse.org' } as never);

    const res = await POST(new Request('http://localhost:3000/api/admin/allowlist', {
      method: 'POST',
      body: JSON.stringify({ pattern: '*@defuse.org' }),
    }));
    expect(res.status).toBe(409);
  });

  it('rejects empty pattern', async () => {
    const res = await POST(new Request('http://localhost:3000/api/admin/allowlist', {
      method: 'POST',
      body: JSON.stringify({ pattern: '' }),
    }));
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/admin/allowlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminDual.mockResolvedValue(adminUser);
  });

  it('deletes an allowlist entry', async () => {
    mockFindUnique.mockResolvedValue({ id: '1', pattern: '*@defuse.org', isRegex: false } as never);
    vi.mocked(prisma.allowlistEntry.delete).mockResolvedValue({} as never);
    mockFindMany.mockResolvedValue([] as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);

    const res = await DELETE(new Request('http://localhost:3000/api/admin/allowlist?id=1', {
      method: 'DELETE',
    }));
    expect(res.status).toBe(200);
  });

  it('returns 404 for missing entry', async () => {
    mockFindUnique.mockResolvedValue(null as never);

    const res = await DELETE(new Request('http://localhost:3000/api/admin/allowlist?id=missing', {
      method: 'DELETE',
    }));
    expect(res.status).toBe(404);
  });
});
