export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createRequestLogger } from '@/lib/logger';
import { requireAdminDual, isAuthError } from '@/lib/auth/helpers';
import { matchesPattern } from '@/lib/auth/allowlist';

export async function GET(request: Request) {
  const logger = createRequestLogger(request, 'api');

  const authResult = await requireAdminDual(request);
  if (isAuthError(authResult)) {
    logger.warn('admin.allowlist.list.unauthorized');
    return authResult;
  }

  try {
    const entries = await prisma.allowlistEntry.findMany({
      orderBy: { createdAt: 'desc' },
    });

    logger.info('admin.allowlist.list', {
      metadata: { count: entries.length },
    });

    return NextResponse.json({ data: entries });
  } catch (error) {
    logger.error('admin.allowlist.list.failed', error as Error);
    return NextResponse.json({ error: 'Failed to list allowlist' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const logger = createRequestLogger(request, 'api');

  const authResult = await requireAdminDual(request);
  if (isAuthError(authResult)) {
    logger.warn('admin.allowlist.add.unauthorized');
    return authResult;
  }

  try {
    const body = await request.json();
    const { pattern, isRegex } = body as { pattern: string; isRegex?: boolean };

    if (!pattern) {
      return NextResponse.json({ error: 'pattern is required' }, { status: 400 });
    }

    // Check for duplicate
    const existing = await prisma.allowlistEntry.findUnique({
      where: { pattern },
    });
    if (existing) {
      return NextResponse.json({ error: 'Pattern already exists' }, { status: 409 });
    }

    const entry = await prisma.allowlistEntry.create({
      data: {
        pattern,
        isRegex: isRegex ?? false,
        createdBy: authResult.id,
      },
    });

    // Re-check users without an override against the new entry
    const users = await prisma.user.findMany({
      where: { email: { not: null }, isAllowlisted: false, allowlistOverride: null },
      select: { id: true, email: true },
    });

    let updatedCount = 0;
    for (const user of users) {
      if (user.email && matchesPattern(user.email, entry)) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isAllowlisted: true },
        });
        updatedCount++;
      }
    }

    logger.info('admin.allowlist.added', {
      metadata: { pattern, isRegex: isRegex ?? false, usersUpdated: updatedCount },
    });

    return NextResponse.json({ data: entry });
  } catch (error) {
    logger.error('admin.allowlist.add.failed', error as Error);
    return NextResponse.json({ error: 'Failed to add allowlist entry' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const logger = createRequestLogger(request, 'api');

  const authResult = await requireAdminDual(request);
  if (isAuthError(authResult)) {
    logger.warn('admin.allowlist.delete.unauthorized');
    return authResult;
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const entry = await prisma.allowlistEntry.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    await prisma.allowlistEntry.delete({ where: { id } });

    // Re-check affected users — skip those with an override
    const remainingEntries = await prisma.allowlistEntry.findMany();
    const users = await prisma.user.findMany({
      where: { email: { not: null }, isAllowlisted: true, allowlistOverride: null },
      select: { id: true, email: true },
    });

    let demotedCount = 0;
    for (const user of users) {
      if (!user.email) continue;
      const stillAllowlisted = remainingEntries.some((e) =>
        matchesPattern(user.email!, e)
      );
      if (!stillAllowlisted) {
        // Check if user is an initial admin (they stay allowlisted)
        const initialAdmins = (process.env.INITIAL_ADMINS || '')
          .split(',')
          .map((e) => e.trim().toLowerCase());
        if (!initialAdmins.includes(user.email.toLowerCase())) {
          await prisma.user.update({
            where: { id: user.id },
            data: { isAllowlisted: false },
          });
          demotedCount++;
        }
      }
    }

    logger.info('admin.allowlist.deleted', {
      metadata: { pattern: entry.pattern, usersDemoted: demotedCount },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    logger.error('admin.allowlist.delete.failed', error as Error);
    return NextResponse.json({ error: 'Failed to delete allowlist entry' }, { status: 500 });
  }
}
