import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

import { getServerSession } from 'next-auth';
import { getSession, requireAuth, requireAdmin, requireAdminDual, isAuthError } from '@/lib/auth/helpers';

const mockGetServerSession = vi.mocked(getServerSession);

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      image: null,
      role: 'USER' as const,
      isAllowlisted: false,
      creditsRemaining: 5,
      dailyCreditLimit: 10,
      ...overrides,
    },
  };
}

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/test', {
    headers,
  });
}

describe('getSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns session when authenticated', async () => {
    const session = makeSession();
    mockGetServerSession.mockResolvedValue(session);

    const result = await getSession();
    expect(result).toEqual(session);
  });

  it('returns null when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const result = await getSession();
    expect(result).toBeNull();
  });
});

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user when authenticated', async () => {
    const session = makeSession();
    mockGetServerSession.mockResolvedValue(session);

    const result = await requireAuth();
    expect(isAuthError(result)).toBe(false);
    if (!isAuthError(result)) {
      expect(result.id).toBe('user-1');
    }
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const result = await requireAuth();
    expect(isAuthError(result)).toBe(true);
    if (isAuthError(result)) {
      expect(result.status).toBe(401);
    }
  });
});

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user when admin', async () => {
    const session = makeSession({ role: 'ADMIN' });
    mockGetServerSession.mockResolvedValue(session);

    const result = await requireAdmin();
    expect(isAuthError(result)).toBe(false);
    if (!isAuthError(result)) {
      expect(result.role).toBe('ADMIN');
    }
  });

  it('returns 403 when not admin', async () => {
    const session = makeSession({ role: 'USER' });
    mockGetServerSession.mockResolvedValue(session);

    const result = await requireAdmin();
    expect(isAuthError(result)).toBe(true);
    if (isAuthError(result)) {
      expect(result.status).toBe(403);
    }
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const result = await requireAdmin();
    expect(isAuthError(result)).toBe(true);
    if (isAuthError(result)) {
      expect(result.status).toBe(401);
    }
  });
});

describe('requireAdminDual', () => {
  const originalEnv = process.env.ADMIN_API_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_API_SECRET = 'test-admin-secret';
  });

  afterEach(() => {
    process.env.ADMIN_API_SECRET = originalEnv;
  });

  it('returns admin user when valid x-admin-secret provided', async () => {
    const request = makeRequest({ 'x-admin-secret': 'test-admin-secret' });

    const result = await requireAdminDual(request);
    expect(isAuthError(result)).toBe(false);
    if (!isAuthError(result)) {
      expect(result.id).toBe('admin-secret');
      expect(result.role).toBe('ADMIN');
    }
  });

  it('falls back to session when no secret provided', async () => {
    const session = makeSession({ role: 'ADMIN' });
    mockGetServerSession.mockResolvedValue(session);
    const request = makeRequest();

    const result = await requireAdminDual(request);
    expect(isAuthError(result)).toBe(false);
    if (!isAuthError(result)) {
      expect(result.id).toBe('user-1');
    }
  });

  it('returns 403 when secret is wrong and user is not admin', async () => {
    const session = makeSession({ role: 'USER' });
    mockGetServerSession.mockResolvedValue(session);
    const request = makeRequest({ 'x-admin-secret': 'wrong-secret' });

    const result = await requireAdminDual(request);
    expect(isAuthError(result)).toBe(true);
    if (isAuthError(result)) {
      expect(result.status).toBe(403);
    }
  });

  it('returns 401 when no secret and no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const request = makeRequest();

    const result = await requireAdminDual(request);
    expect(isAuthError(result)).toBe(true);
    if (isAuthError(result)) {
      expect(result.status).toBe(401);
    }
  });
});

describe('isAuthError', () => {
  it('returns true for NextResponse', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const result = await requireAuth();
    expect(isAuthError(result)).toBe(true);
  });

  it('returns false for user object', async () => {
    const session = makeSession();
    mockGetServerSession.mockResolvedValue(session);
    const result = await requireAuth();
    expect(isAuthError(result)).toBe(false);
  });
});
