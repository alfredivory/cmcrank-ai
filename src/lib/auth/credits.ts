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
 * Read-only: does not write to DB. If 24h have passed since last reset,
 * returns the full limit (virtual reset). Actual DB reset happens lazily
 * inside consumeCredit.
 */
export async function getCreditsRemaining(userId: string): Promise<number> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const limit = getEffectiveLimit(user);

  if (limit === UNLIMITED_CREDITS) return UNLIMITED_CREDITS;

  const elapsed = Date.now() - new Date(user.creditsResetAt).getTime();
  if (elapsed >= TWENTY_FOUR_HOURS_MS) return limit; // window expired → full credits

  return Math.max(0, limit - user.researchCreditsUsed);
}

/**
 * Consumes one research credit atomically. Returns success/failure and remaining count.
 * Admins always succeed with remaining = -1.
 *
 * Uses a single atomic UPDATE with a WHERE guard so concurrent requests
 * are serialized by PostgreSQL's row-level lock. The CASE expression handles
 * both "reset-and-consume" (24h expired) and "just-consume" in one shot.
 */
export async function consumeCredit(
  userId: string
): Promise<{ success: boolean; remaining: number }> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const limit = getEffectiveLimit(user);

  if (limit === UNLIMITED_CREDITS) return { success: true, remaining: UNLIMITED_CREDITS };
  if (limit <= 0) return { success: false, remaining: 0 };

  const now = new Date();
  const resetThreshold = new Date(now.getTime() - TWENTY_FOUR_HOURS_MS);

  const rowsAffected = await prisma.$executeRaw`
    UPDATE "User"
    SET
      "researchCreditsUsed" = CASE
        WHEN "creditsResetAt" <= ${resetThreshold} THEN 1
        ELSE "researchCreditsUsed" + 1
      END,
      "creditsResetAt" = CASE
        WHEN "creditsResetAt" <= ${resetThreshold} THEN ${now}
        ELSE "creditsResetAt"
      END,
      "updatedAt" = ${now}
    WHERE "id" = ${userId}
    AND (
      "creditsResetAt" <= ${resetThreshold}
      OR "researchCreditsUsed" < ${limit}
    )
  `;

  if (rowsAffected === 0) return { success: false, remaining: 0 };

  // Read back to compute remaining
  const updated = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const newRemaining = Math.max(0, limit - updated.researchCreditsUsed);
  return { success: true, remaining: newRemaining };
}
