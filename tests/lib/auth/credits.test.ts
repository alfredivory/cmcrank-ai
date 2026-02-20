import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    $executeRaw: vi.fn(),
  },
}));

import { prisma } from '@/lib/db';
import { getDailyLimit, getEffectiveLimit, getCreditsRemaining, consumeCredit, UNLIMITED_CREDITS } from '@/lib/auth/credits';

const mockFindUser = vi.mocked(prisma.user.findUniqueOrThrow);
const mockUpdateUser = vi.mocked(prisma.user.update);
const mockExecuteRaw = vi.mocked(prisma.$executeRaw);

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    role: 'USER',
    researchCreditsUsed: 0,
    creditsResetAt: new Date(),
    dailyCreditLimit: null,
    ...overrides,
  };
}

describe('getDailyLimit', () => {
  const originalEnv = process.env.RESEARCH_CREDITS_PER_DAY;

  beforeEach(() => {
    process.env.RESEARCH_CREDITS_PER_DAY = originalEnv;
  });

  it('returns default of 5 when env var is not set', () => {
    delete process.env.RESEARCH_CREDITS_PER_DAY;
    expect(getDailyLimit()).toBe(5);
  });

  it('returns parsed env var value', () => {
    process.env.RESEARCH_CREDITS_PER_DAY = '10';
    expect(getDailyLimit()).toBe(10);
  });

  it('returns default for non-numeric env var', () => {
    process.env.RESEARCH_CREDITS_PER_DAY = 'abc';
    expect(getDailyLimit()).toBe(5);
  });
});

describe('getEffectiveLimit', () => {
  beforeEach(() => {
    process.env.RESEARCH_CREDITS_PER_DAY = '5';
  });

  it('returns unlimited for admins', () => {
    expect(getEffectiveLimit({ role: 'ADMIN', dailyCreditLimit: null })).toBe(UNLIMITED_CREDITS);
  });

  it('returns unlimited for admins even with per-user limit set', () => {
    expect(getEffectiveLimit({ role: 'ADMIN', dailyCreditLimit: 10 })).toBe(UNLIMITED_CREDITS);
  });

  it('returns per-user limit when set', () => {
    expect(getEffectiveLimit({ role: 'USER', dailyCreditLimit: 20 })).toBe(20);
  });

  it('returns global default when no per-user limit', () => {
    expect(getEffectiveLimit({ role: 'USER', dailyCreditLimit: null })).toBe(5);
  });
});

describe('getCreditsRemaining', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEARCH_CREDITS_PER_DAY = '5';
  });

  it('returns full credits when none used', async () => {
    mockFindUser.mockResolvedValue(makeUser() as never);

    const result = await getCreditsRemaining('user-1');
    expect(result).toBe(5);
  });

  it('returns remaining credits', async () => {
    mockFindUser.mockResolvedValue(makeUser({ researchCreditsUsed: 3 }) as never);

    const result = await getCreditsRemaining('user-1');
    expect(result).toBe(2);
  });

  it('returns full credits when 24h have passed (virtual reset, no DB write)', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
    mockFindUser.mockResolvedValue(
      makeUser({ researchCreditsUsed: 5, creditsResetAt: oldDate }) as never
    );

    const result = await getCreditsRemaining('user-1');
    expect(result).toBe(5);
    // No DB write — purely read-only
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('returns 0 when all credits used', async () => {
    mockFindUser.mockResolvedValue(makeUser({ researchCreditsUsed: 5 }) as never);

    const result = await getCreditsRemaining('user-1');
    expect(result).toBe(0);
  });

  it('returns unlimited for admin users', async () => {
    mockFindUser.mockResolvedValue(makeUser({ role: 'ADMIN' }) as never);

    const result = await getCreditsRemaining('user-1');
    expect(result).toBe(UNLIMITED_CREDITS);
  });

  it('uses per-user limit when set', async () => {
    mockFindUser.mockResolvedValue(makeUser({ dailyCreditLimit: 10, researchCreditsUsed: 3 }) as never);

    const result = await getCreditsRemaining('user-1');
    expect(result).toBe(7);
  });
});

describe('consumeCredit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEARCH_CREDITS_PER_DAY = '5';
  });

  it('consumes a credit successfully via atomic UPDATE', async () => {
    // Initial read to get role/limit
    mockFindUser.mockResolvedValueOnce(makeUser({ researchCreditsUsed: 2 }) as never);
    // Atomic UPDATE succeeds (1 row affected)
    mockExecuteRaw.mockResolvedValueOnce(1 as never);
    // Read-back after UPDATE
    mockFindUser.mockResolvedValueOnce(makeUser({ researchCreditsUsed: 3 }) as never);

    const result = await consumeCredit('user-1');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
    expect(mockExecuteRaw).toHaveBeenCalledTimes(1);
  });

  it('fails when no credits remaining (atomic UPDATE affects 0 rows)', async () => {
    mockFindUser.mockResolvedValueOnce(makeUser({ researchCreditsUsed: 5 }) as never);
    // Atomic UPDATE fails (0 rows — WHERE guard blocks)
    mockExecuteRaw.mockResolvedValueOnce(0 as never);

    const result = await consumeCredit('user-1');
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets and consumes when 24h passed (atomic reset-and-consume)', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
    // Initial read
    mockFindUser.mockResolvedValueOnce(
      makeUser({ researchCreditsUsed: 5, creditsResetAt: oldDate }) as never
    );
    // Atomic UPDATE succeeds (reset + consume in one shot)
    mockExecuteRaw.mockResolvedValueOnce(1 as never);
    // Read-back shows reset state
    mockFindUser.mockResolvedValueOnce(
      makeUser({ researchCreditsUsed: 1, creditsResetAt: new Date() }) as never
    );

    const result = await consumeCredit('user-1');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('always succeeds for admin users (bypasses atomic UPDATE)', async () => {
    mockFindUser.mockResolvedValue(makeUser({ role: 'ADMIN', researchCreditsUsed: 999 }) as never);

    const result = await consumeCredit('user-1');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(UNLIMITED_CREDITS);
    // Admin bypass — no $executeRaw called
    expect(mockExecuteRaw).not.toHaveBeenCalled();
  });

  it('fails immediately when effective limit is 0', async () => {
    mockFindUser.mockResolvedValueOnce(makeUser({ dailyCreditLimit: 0 }) as never);

    const result = await consumeCredit('user-1');
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(mockExecuteRaw).not.toHaveBeenCalled();
  });
});
