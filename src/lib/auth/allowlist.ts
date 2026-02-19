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
 * Updates a user's isAllowlisted status based on current allowlist entries.
 */
export async function refreshUserAllowlistStatus(
  userId: string,
  email: string
): Promise<boolean> {
  const allowlisted = await isEmailAllowlisted(email);
  await prisma.user.update({
    where: { id: userId },
    data: { isAllowlisted: allowlisted },
  });
  return allowlisted;
}
