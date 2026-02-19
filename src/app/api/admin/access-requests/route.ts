export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createRequestLogger } from '@/lib/logger';
import { requireAdminDual, isAuthError } from '@/lib/auth/helpers';

export async function GET(request: Request) {
  const logger = createRequestLogger(request, 'api');

  const authResult = await requireAdminDual(request);
  if (isAuthError(authResult)) {
    logger.warn('admin.accessRequests.list.unauthorized');
    return authResult;
  }

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || undefined;

    const requests = await prisma.accessRequest.findMany({
      where: status ? { status: status as 'PENDING' | 'APPROVED' | 'DENIED' } : undefined,
      include: {
        user: {
          select: { name: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    logger.info('admin.accessRequests.list', {
      metadata: { count: requests.length, filter: status },
    });

    return NextResponse.json({ data: requests });
  } catch (error) {
    logger.error('admin.accessRequests.list.failed', error as Error);
    return NextResponse.json({ error: 'Failed to list access requests' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const logger = createRequestLogger(request, 'api');

  const authResult = await requireAdminDual(request);
  if (isAuthError(authResult)) {
    logger.warn('admin.accessRequests.update.unauthorized');
    return authResult;
  }

  try {
    const body = await request.json();
    const { requestId, action } = body as { requestId: string; action: 'approve' | 'deny' };

    if (!requestId || !action) {
      return NextResponse.json({ error: 'requestId and action are required' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'deny') {
      return NextResponse.json({ error: 'Action must be approve or deny' }, { status: 400 });
    }

    const accessRequest = await prisma.accessRequest.findUnique({
      where: { id: requestId },
    });

    if (!accessRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (accessRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'APPROVED' : 'DENIED';

    await prisma.accessRequest.update({
      where: { id: requestId },
      data: { status: newStatus },
    });

    if (action === 'approve') {
      // Add email to allowlist and set user as allowlisted
      const existingEntry = await prisma.allowlistEntry.findUnique({
        where: { pattern: accessRequest.email },
      });
      if (!existingEntry) {
        await prisma.allowlistEntry.create({
          data: {
            pattern: accessRequest.email,
            isRegex: false,
            createdBy: authResult.id,
          },
        });
      }

      await prisma.user.update({
        where: { id: accessRequest.userId },
        data: { isAllowlisted: true },
      });
    }

    logger.info('admin.accessRequests.processed', {
      metadata: {
        requestId,
        action,
        email: accessRequest.email,
        processedBy: authResult.id,
      },
    });

    return NextResponse.json({ data: { success: true, status: newStatus } });
  } catch (error) {
    logger.error('admin.accessRequests.update.failed', error as Error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
