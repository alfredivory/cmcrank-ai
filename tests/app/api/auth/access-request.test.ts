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
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const mockRequireAuth = vi.fn();
vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: () => mockRequireAuth(),
  isAuthError: (result: unknown) => result instanceof Response,
}));

import { POST } from '@/app/api/auth/access-request/route';
import { prisma } from '@/lib/db';

const authUser = {
  id: 'u1',
  name: 'Test User',
  email: 'user@test.com',
  image: null,
  role: 'USER' as const,
  isAllowlisted: false,
  creditsRemaining: 0,
};

describe('POST /api/auth/access-request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue(authUser);
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValue(new Response('Unauthorized', { status: 401 }));

    const res = await POST(new Request('http://localhost:3000/api/auth/access-request', {
      method: 'POST',
    }));
    expect(res.status).toBe(401);
  });

  it('returns 409 when already allowlisted', async () => {
    mockRequireAuth.mockResolvedValue({ ...authUser, isAllowlisted: true });

    const res = await POST(new Request('http://localhost:3000/api/auth/access-request', {
      method: 'POST',
    }));
    expect(res.status).toBe(409);
  });

  it('returns 409 when pending request exists', async () => {
    vi.mocked(prisma.accessRequest.findFirst).mockResolvedValue({ id: 'r1', status: 'PENDING' } as never);

    const res = await POST(new Request('http://localhost:3000/api/auth/access-request', {
      method: 'POST',
    }));
    expect(res.status).toBe(409);
  });

  it('creates access request successfully', async () => {
    vi.mocked(prisma.accessRequest.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.accessRequest.create).mockResolvedValue({
      id: 'r1', userId: 'u1', email: 'user@test.com', status: 'PENDING',
    } as never);

    const res = await POST(new Request('http://localhost:3000/api/auth/access-request', {
      method: 'POST',
    }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.status).toBe('PENDING');
  });
});
