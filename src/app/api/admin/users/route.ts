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
    const { userId, role } = body as { userId: string; role: string };

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
    }

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

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: role as 'USER' | 'ADMIN' },
      select: { id: true, role: true, email: true },
    });

    logger.info('admin.users.roleChanged', {
      userId: updated.id,
      metadata: { newRole: role, changedBy: authResult.id },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    logger.error('admin.users.update.failed', error as Error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
