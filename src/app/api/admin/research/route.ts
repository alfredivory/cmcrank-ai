export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createRequestLogger } from '@/lib/logger';
import { requireAdminDual, isAuthError } from '@/lib/auth/helpers';
import type { ResearchStatus } from '@prisma/client';

const VALID_STATUSES: ResearchStatus[] = ['COMPLETE', 'RUNNING', 'PENDING', 'FAILED'];

export async function GET(request: Request) {
  const logger = createRequestLogger(request, 'api');

  const authResult = await requireAdminDual(request);
  if (isAuthError(authResult)) {
    logger.warn('admin.research.list.unauthorized');
    return authResult;
  }

  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const visibility = url.searchParams.get('visibility') || undefined;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const where: Record<string, unknown> = {};

    if (search) {
      where.token = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { symbol: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    if (status && VALID_STATUSES.includes(status as ResearchStatus)) {
      where.status = status;
    }

    if (visibility === 'visible') {
      where.isVisible = true;
    } else if (visibility === 'hidden') {
      where.isVisible = false;
    }

    const [items, total] = await Promise.all([
      prisma.research.findMany({
        where,
        include: {
          token: {
            select: { name: true, symbol: true, slug: true },
          },
          triggeredBy: {
            select: { name: true, email: true },
          },
          feedback: {
            select: { rating: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.research.count({ where }),
    ]);

    const data = items.map((item) => ({
      id: item.id,
      tokenId: item.tokenId,
      dateRangeStart: item.dateRangeStart,
      dateRangeEnd: item.dateRangeEnd,
      status: item.status,
      importanceScore: item.importanceScore,
      isVisible: item.isVisible,
      createdAt: item.createdAt,
      token: item.token,
      triggeredBy: item.triggeredBy,
      feedback: {
        thumbsUp: item.feedback.filter((f) => f.rating === 'THUMBS_UP').length,
        thumbsDown: item.feedback.filter((f) => f.rating === 'THUMBS_DOWN').length,
      },
    }));

    logger.info('admin.research.list', {
      metadata: { count: data.length, total, search, status, visibility },
    });

    return NextResponse.json({
      data: {
        items: data,
        pagination: { total, limit, offset, hasMore: offset + limit < total },
      },
    });
  } catch (error) {
    logger.error('admin.research.list.failed', error as Error);
    return NextResponse.json({ error: 'Failed to list research' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const logger = createRequestLogger(request, 'api');

  const authResult = await requireAdminDual(request);
  if (isAuthError(authResult)) {
    logger.warn('admin.research.update.unauthorized');
    return authResult;
  }

  try {
    const body = await request.json();
    const { researchId, isVisible } = body as { researchId?: string; isVisible?: unknown };

    if (!researchId || typeof researchId !== 'string') {
      return NextResponse.json({ error: 'researchId is required' }, { status: 400 });
    }

    if (typeof isVisible !== 'boolean') {
      return NextResponse.json({ error: 'isVisible must be a boolean' }, { status: 400 });
    }

    const updated = await prisma.research.update({
      where: { id: researchId },
      data: { isVisible },
      select: {
        id: true,
        isVisible: true,
        status: true,
      },
    });

    logger.info('admin.research.visibility_toggled', {
      metadata: {
        researchId,
        isVisible,
        changedBy: authResult.id,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    logger.error('admin.research.update.failed', error as Error);
    return NextResponse.json({ error: 'Failed to update research' }, { status: 500 });
  }
}
