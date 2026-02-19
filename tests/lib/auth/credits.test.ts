import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';
import { getDailyLimit, getCreditsRemaining, consumeCredit } from '@/lib/auth/credits';

const mockFindUser = vi.mocked(prisma.user.findUniqueOrThrow);
const mockUpdateUser = vi.mocked(prisma.user.update);

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    researchCreditsUsed: 0,
    creditsResetAt: new Date(),
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

describe('getCreditsRemaining', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEARCH_CREDITS_PER_DAY = '5';
  });

  it('returns full credits when none used', async () => {
    mockFindUser.mockResolvedValue(makeUser() as never);
    mockUpdateUser.mockResolvedValue({} as never);

    const result = await getCreditsRemaining('user-1');
    expect(result).toBe(5);
  });

  it('returns remaining credits', async () => {
    mockFindUser.mockResolvedValue(makeUser({ researchCreditsUsed: 3 }) as never);

    const result = await getCreditsRemaining('user-1');
    expect(result).toBe(2);
  });

  it('auto-resets credits after 24 hours', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
    mockFindUser.mockResolvedValue(
      makeUser({ researchCreditsUsed: 5, creditsResetAt: oldDate }) as never
    );
    mockUpdateUser.mockResolvedValue({} as never);

    const result = await getCreditsRemaining('user-1');
    expect(result).toBe(5);
    expect(mockUpdateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({ researchCreditsUsed: 0 }),
      })
    );
  });

  it('returns 0 when all credits used', async () => {
    mockFindUser.mockResolvedValue(makeUser({ researchCreditsUsed: 5 }) as never);

    const result = await getCreditsRemaining('user-1');
    expect(result).toBe(0);
  });
});

describe('consumeCredit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEARCH_CREDITS_PER_DAY = '5';
  });

  it('consumes a credit successfully', async () => {
    mockFindUser.mockResolvedValue(makeUser({ researchCreditsUsed: 2 }) as never);
    mockUpdateUser.mockResolvedValue(makeUser({ researchCreditsUsed: 3 }) as never);

    const result = await consumeCredit('user-1');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('fails when no credits remaining', async () => {
    mockFindUser.mockResolvedValue(makeUser({ researchCreditsUsed: 5 }) as never);

    const result = await consumeCredit('user-1');
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets and consumes when 24h passed', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
    // First call for getCreditsRemaining
    mockFindUser.mockResolvedValueOnce(
      makeUser({ researchCreditsUsed: 5, creditsResetAt: oldDate }) as never
    );
    // Reset update in getCreditsRemaining
    mockUpdateUser.mockResolvedValueOnce({} as never);
    // Second call for consumeCredit's own findUnique
    mockFindUser.mockResolvedValueOnce(
      makeUser({ researchCreditsUsed: 5, creditsResetAt: oldDate }) as never
    );
    // Update in consumeCredit
    mockUpdateUser.mockResolvedValueOnce(makeUser({ researchCreditsUsed: 1 }) as never);

    const result = await consumeCredit('user-1');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });
});
