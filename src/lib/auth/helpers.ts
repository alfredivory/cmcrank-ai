import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './index';
import type { Session } from 'next-auth';

/**
 * Get the current server session.
 */
export async function getSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

/**
 * Requires authentication. Returns session user or a 401 Response.
 */
export async function requireAuth(): Promise<
  Session['user'] | NextResponse
> {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session.user;
}

/**
 * Requires ADMIN role. Returns session user or a 403 Response.
 */
export async function requireAdmin(): Promise<
  Session['user'] | NextResponse
> {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return session.user;
}

/**
 * Checks NextAuth session OR x-admin-secret header (backward compat).
 * Returns session user (or a synthetic admin user for secret auth), or 401/403 Response.
 */
export async function requireAdminDual(
  request: Request
): Promise<Session['user'] | NextResponse> {
  // Check x-admin-secret header first (backward compat for curl/cron)
  const secret = request.headers.get('x-admin-secret');
  const expected = process.env.ADMIN_API_SECRET;
  if (secret && expected && secret === expected) {
    return {
      id: 'admin-secret',
      name: 'Admin (API Secret)',
      email: null,
      image: null,
      role: 'ADMIN',
      isAllowlisted: true,
      creditsRemaining: -1,
      dailyCreditLimit: -1,
    };
  }

  // Fall back to session-based auth
  return requireAdmin();
}

/**
 * Type guard: returns true if the result is a NextResponse (error).
 */
export function isAuthError(
  result: Session['user'] | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
