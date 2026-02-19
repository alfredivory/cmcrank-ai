import { describe, it, expect, vi, beforeEach } from 'vitest';
import { matchesPattern } from '@/lib/auth/allowlist';

// Mock prisma for isEmailAllowlisted and refreshUserAllowlistStatus
vi.mock('@/lib/db', () => ({
  prisma: {
    allowlistEntry: {
      findMany: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';
import { isEmailAllowlisted, refreshUserAllowlistStatus } from '@/lib/auth/allowlist';

const mockFindMany = vi.mocked(prisma.allowlistEntry.findMany);
const mockUserUpdate = vi.mocked(prisma.user.update);

describe('matchesPattern', () => {
  it('matches exact email (case-insensitive)', () => {
    expect(matchesPattern('Alex@Defuse.org', { pattern: 'alex@defuse.org', isRegex: false })).toBe(true);
  });

  it('rejects non-matching exact email', () => {
    expect(matchesPattern('bob@other.com', { pattern: 'alex@defuse.org', isRegex: false })).toBe(false);
  });

  it('matches glob pattern *@domain.org', () => {
    expect(matchesPattern('anyone@defuse.org', { pattern: '*@defuse.org', isRegex: false })).toBe(true);
  });

  it('rejects email not matching glob pattern', () => {
    expect(matchesPattern('user@other.com', { pattern: '*@defuse.org', isRegex: false })).toBe(false);
  });

  it('matches glob pattern with prefix', () => {
    expect(matchesPattern('alex.s@defuse.org', { pattern: 'alex.*@defuse.org', isRegex: false })).toBe(true);
  });

  it('matches regex pattern', () => {
    expect(matchesPattern('user@aurora.dev', { pattern: '^.*@aurora\\.dev$', isRegex: true })).toBe(true);
  });

  it('rejects non-matching regex pattern', () => {
    expect(matchesPattern('user@other.com', { pattern: '^.*@aurora\\.dev$', isRegex: true })).toBe(false);
  });

  it('handles invalid regex gracefully', () => {
    expect(matchesPattern('user@test.com', { pattern: '[invalid', isRegex: true })).toBe(false);
  });

  it('is case-insensitive for exact match', () => {
    expect(matchesPattern('USER@DEFUSE.ORG', { pattern: 'user@defuse.org', isRegex: false })).toBe(true);
  });

  it('is case-insensitive for regex match', () => {
    expect(matchesPattern('USER@AURORA.DEV', { pattern: '^.*@aurora\\.dev$', isRegex: true })).toBe(true);
  });
});

describe('isEmailAllowlisted', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when email matches an entry', async () => {
    mockFindMany.mockResolvedValue([
      { id: '1', pattern: '*@defuse.org', isRegex: false, createdAt: new Date(), createdBy: null },
    ]);

    expect(await isEmailAllowlisted('alex@defuse.org')).toBe(true);
  });

  it('returns false when email matches no entry', async () => {
    mockFindMany.mockResolvedValue([
      { id: '1', pattern: '*@defuse.org', isRegex: false, createdAt: new Date(), createdBy: null },
    ]);

    expect(await isEmailAllowlisted('user@other.com')).toBe(false);
  });

  it('returns false when no entries exist', async () => {
    mockFindMany.mockResolvedValue([]);

    expect(await isEmailAllowlisted('user@test.com')).toBe(false);
  });
});

describe('refreshUserAllowlistStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates user to allowlisted when email matches', async () => {
    mockFindMany.mockResolvedValue([
      { id: '1', pattern: 'alex@defuse.org', isRegex: false, createdAt: new Date(), createdBy: null },
    ]);
    mockUserUpdate.mockResolvedValue({} as ReturnType<typeof prisma.user.update> extends Promise<infer T> ? T : never);

    const result = await refreshUserAllowlistStatus('user-1', 'alex@defuse.org');

    expect(result).toBe(true);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { isAllowlisted: true },
    });
  });

  it('updates user to not allowlisted when email does not match', async () => {
    mockFindMany.mockResolvedValue([]);
    mockUserUpdate.mockResolvedValue({} as ReturnType<typeof prisma.user.update> extends Promise<infer T> ? T : never);

    const result = await refreshUserAllowlistStatus('user-1', 'user@other.com');

    expect(result).toBe(false);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { isAllowlisted: false },
    });
  });
});
