import { prisma } from '@/lib/db';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/** Sentinel value indicating unlimited credits. */
export const UNLIMITED_CREDITS = -1;

/**
 * Returns the global daily research credit limit from env (default 5).
 */
export function getDailyLimit(): number {
  const envValue = process.env.RESEARCH_CREDITS_PER_DAY;
  if (!envValue) return 5;
  const parsed = parseInt(envValue, 10);
  return isNaN(parsed) ? 5 : parsed;
}

/**
 * Returns the effective daily limit for a user.
 * Admins → unlimited (-1). Per-user override → that value. Otherwise → global default.
 */
export function getEffectiveLimit(user: {
  role: string;
  dailyCreditLimit: number | null;
}): number {
  if (user.role === 'ADMIN') return UNLIMITED_CREDITS;
  if (user.dailyCreditLimit !== null && user.dailyCreditLimit !== undefined) {
    return user.dailyCreditLimit;
  }
  return getDailyLimit();
}

/**
 * Returns the number of credits remaining for a user today.
 * Returns -1 for unlimited (admins).
 * Auto-resets if 24h have passed since last reset.
 */
export async function getCreditsRemaining(userId: string): Promise<number> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const limit = getEffectiveLimit(user);

  if (limit === UNLIMITED_CREDITS) return UNLIMITED_CREDITS;

  const now = new Date();
  const resetAt = new Date(user.creditsResetAt);

  if (now.getTime() - resetAt.getTime() >= TWENTY_FOUR_HOURS_MS) {
    // Reset credits
    await prisma.user.update({
      where: { id: userId },
      data: { researchCreditsUsed: 0, creditsResetAt: now },
    });
    return limit;
  }

  return Math.max(0, limit - user.researchCreditsUsed);
}

/**
 * Consumes one research credit. Returns success/failure and remaining count.
 * Admins always succeed with remaining = -1.
 */
export async function consumeCredit(
  userId: string
): Promise<{ success: boolean; remaining: number }> {
  const remaining = await getCreditsRemaining(userId);

  // Unlimited credits (admin)
  if (remaining === UNLIMITED_CREDITS) {
    return { success: true, remaining: UNLIMITED_CREDITS };
  }

  if (remaining <= 0) {
    return { success: false, remaining: 0 };
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const limit = getEffectiveLimit(user);
  const now = new Date();
  const resetAt = new Date(user.creditsResetAt);
  const needsReset = now.getTime() - resetAt.getTime() >= TWENTY_FOUR_HOURS_MS;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      researchCreditsUsed: needsReset ? 1 : user.researchCreditsUsed + 1,
      creditsResetAt: needsReset ? now : user.creditsResetAt,
    },
  });

  const newRemaining = Math.max(0, limit - updated.researchCreditsUsed);
  return { success: true, remaining: newRemaining };
}
