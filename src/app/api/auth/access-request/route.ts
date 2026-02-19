export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createRequestLogger } from '@/lib/logger';
import { requireAuth, isAuthError } from '@/lib/auth/helpers';

export async function POST(request: Request) {
  const logger = createRequestLogger(request, 'api');

  const authResult = await requireAuth();
  if (isAuthError(authResult)) {
    logger.warn('auth.accessRequest.submit.unauthorized');
    return authResult;
  }

  try {
    const user = authResult;

    // Check if already allowlisted
    if (user.isAllowlisted) {
      return NextResponse.json({ error: 'Already allowlisted' }, { status: 409 });
    }

    // Check for existing pending request
    const existing = await prisma.accessRequest.findFirst({
      where: { userId: user.id, status: 'PENDING' },
    });

    if (existing) {
      return NextResponse.json({ error: 'Pending request exists' }, { status: 409 });
    }

    const accessRequest = await prisma.accessRequest.create({
      data: {
        userId: user.id,
        email: user.email || '',
      },
    });

    logger.info('auth.accessRequest.submitted', {
      userId: user.id,
      metadata: { requestId: accessRequest.id, email: user.email },
    });

    return NextResponse.json({ data: { id: accessRequest.id, status: 'PENDING' } });
  } catch (error) {
    logger.error('auth.accessRequest.submit.failed', error as Error);
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const logger = createRequestLogger(request, 'api');

  const authResult = await requireAuth();
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const latestRequest = await prisma.accessRequest.findFirst({
      where: { userId: authResult.id },
      orderBy: { createdAt: 'desc' },
    });

    logger.info('auth.accessRequest.status', {
      userId: authResult.id,
      metadata: { status: latestRequest?.status || 'none' },
    });

    return NextResponse.json({
      data: latestRequest
        ? { id: latestRequest.id, status: latestRequest.status }
        : null,
    });
  } catch (error) {
    logger.error('auth.accessRequest.status.failed', error as Error);
    return NextResponse.json({ error: 'Failed to get request status' }, { status: 500 });
  }
}
