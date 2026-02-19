import { prisma } from '@/lib/db';

/**
 * Checks if an email matches an allowlist pattern.
 * Supports exact match, glob patterns (e.g., *@defuse.org), and regex.
 */
export function matchesPattern(
  email: string,
  entry: { pattern: string; isRegex: boolean }
): boolean {
  const normalizedEmail = email.toLowerCase();

  if (entry.isRegex) {
    try {
      const regex = new RegExp(entry.pattern, 'i');
      return regex.test(normalizedEmail);
    } catch {
      return false;
    }
  }

  const normalizedPattern = entry.pattern.toLowerCase();

  // Glob pattern: convert *@domain.org to regex
  if (normalizedPattern.includes('*')) {
    const escaped = normalizedPattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    const regex = new RegExp(`^${escaped}$`, 'i');
    return regex.test(normalizedEmail);
  }

  // Exact match (case-insensitive)
  return normalizedEmail === normalizedPattern;
}

/**
 * Checks if an email is allowlisted by checking all AllowlistEntry records.
 */
export async function isEmailAllowlisted(email: string): Promise<boolean> {
  const entries = await prisma.allowlistEntry.findMany();
  return entries.some((entry) => matchesPattern(email, entry));
}

/**
 * Resolves a user's effective allowlist status.
 * If the user has an override (FORCE_YES/FORCE_NO), that takes precedence.
 * Otherwise, checks against allowlist patterns.
 */
export function resolveAllowlistStatus(
  override: string | null,
  matchesPatterns: boolean
): boolean {
  if (override === 'FORCE_YES') return true;
  if (override === 'FORCE_NO') return false;
  return matchesPatterns;
}

/**
 * Updates a user's isAllowlisted status based on current allowlist entries.
 * Respects allowlistOverride — users with an override are not changed by patterns.
 */
export async function refreshUserAllowlistStatus(
  userId: string,
  email: string
): Promise<boolean> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { allowlistOverride: true },
  });

  const matchesPatterns = await isEmailAllowlisted(email);
  const isAllowlisted = resolveAllowlistStatus(user.allowlistOverride, matchesPatterns);

  await prisma.user.update({
    where: { id: userId },
    data: { isAllowlisted },
  });
  return isAllowlisted;
}
