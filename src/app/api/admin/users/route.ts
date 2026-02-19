export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createRequestLogger } from '@/lib/logger';
import { requireAdminDual, isAuthError } from '@/lib/auth/helpers';

export async function GET(request: Request) {
  const logger = createRequestLogger(request, 'api');

  const authResult = await requireAdminDual(request);
  if (isAuthError(authResult)) {
    logger.warn('admin.users.list.unauthorized');
    return authResult;
  }

  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || undefined;

    const users = await prisma.user.findMany({
      where: search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        isAllowlisted: true,
        allowlistOverride: true,
        dailyCreditLimit: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    logger.info('admin.users.list', {
      metadata: { count: users.length, search },
    });

    return NextResponse.json({ data: users });
  } catch (error) {
    logger.error('admin.users.list.failed', error as Error);
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const logger = createRequestLogger(request, 'api');

  const authResult = await requireAdminDual(request);
  if (isAuthError(authResult)) {
    logger.warn('admin.users.update.unauthorized');
    return authResult;
  }

  try {
    const body = await request.json();
    const { userId, role, dailyCreditLimit, allowlistOverride } = body as {
      userId: string;
      role?: string;
      dailyCreditLimit?: number | null;
      allowlistOverride?: 'FORCE_YES' | 'FORCE_NO' | null;
    };

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (role === undefined && dailyCreditLimit === undefined && allowlistOverride === undefined) {
      return NextResponse.json({ error: 'No update fields provided' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    // Handle role update
    if (role !== undefined) {
      if (role !== 'USER' && role !== 'ADMIN') {
        return NextResponse.json({ error: 'Role must be USER or ADMIN' }, { status: 400 });
      }

      // Prevent self-demotion
      if (authResult.id === userId && role === 'USER') {
        return NextResponse.json({ error: 'Cannot demote yourself' }, { status: 400 });
      }

      // Prevent removing last admin
      if (role === 'USER') {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (targetUser?.role === 'ADMIN' && adminCount <= 1) {
          return NextResponse.json({ error: 'Cannot remove the last admin' }, { status: 400 });
        }
      }

      updateData.role = role;
    }

    // Handle allowlistOverride update
    if (allowlistOverride !== undefined) {
      if (allowlistOverride !== null && allowlistOverride !== 'FORCE_YES' && allowlistOverride !== 'FORCE_NO') {
        return NextResponse.json({ error: 'allowlistOverride must be FORCE_YES, FORCE_NO, or null' }, { status: 400 });
      }
      updateData.allowlistOverride = allowlistOverride;
      // Also update isAllowlisted to match the override immediately
      if (allowlistOverride === 'FORCE_YES') {
        updateData.isAllowlisted = true;
      } else if (allowlistOverride === 'FORCE_NO') {
        updateData.isAllowlisted = false;
      }
      // If null (reset to auto), re-check against patterns
      if (allowlistOverride === null) {
        const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
        if (targetUser?.email) {
          const { isEmailAllowlisted } = await import('@/lib/auth/allowlist');
          updateData.isAllowlisted = await isEmailAllowlisted(targetUser.email);
        }
      }
    }

    // Handle dailyCreditLimit update
    if (dailyCreditLimit !== undefined) {
      if (dailyCreditLimit !== null && (typeof dailyCreditLimit !== 'number' || dailyCreditLimit < 0 || !Number.isInteger(dailyCreditLimit))) {
        return NextResponse.json({ error: 'dailyCreditLimit must be a non-negative integer or null' }, { status: 400 });
      }
      updateData.dailyCreditLimit = dailyCreditLimit;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, role: true, email: true, isAllowlisted: true, allowlistOverride: true, dailyCreditLimit: true },
    });

    logger.info('admin.users.updated', {
      userId: updated.id,
      metadata: { ...updateData, changedBy: authResult.id },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    logger.error('admin.users.update.failed', error as Error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
