import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCMCClient } from '@/lib/cmc';
import { createRequestLogger } from '@/lib/logger';
import { startBackfill, pauseBackfill } from '@/workers/backfill';

function isAuthorized(request: Request): boolean {
  const secret = request.headers.get('x-admin-secret');
  const expected = process.env.ADMIN_API_SECRET;
  if (!expected) return false;
  return secret === expected;
}

export async function POST(request: Request) {
  const logger = createRequestLogger(request, 'api');

  if (!isAuthorized(request)) {
    logger.warn('admin.backfill.unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { dateRangeStart, dateRangeEnd, tokenScope } = body as {
      dateRangeStart: string;
      dateRangeEnd: string;
      tokenScope?: number;
    };

    if (!dateRangeStart || !dateRangeEnd) {
      return NextResponse.json(
        { error: 'dateRangeStart and dateRangeEnd are required' },
        { status: 400 }
      );
    }

    const startDate = new Date(dateRangeStart);
    const endDate = new Date(dateRangeEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'dateRangeStart must be before dateRangeEnd' },
        { status: 400 }
      );
    }

    const scope = tokenScope ?? 1000;
    const cmcClient = getCMCClient(logger);

    logger.info('admin.backfill.start', {
      metadata: { dateRangeStart, dateRangeEnd, tokenScope: scope },
    });

    const result = await startBackfill(startDate, endDate, scope, prisma, cmcClient, logger);

    return NextResponse.json({ data: result });
  } catch (error) {
    logger.error('admin.backfill.failed', error as Error);
    return NextResponse.json(
      { error: 'Failed to start backfill' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const logger = createRequestLogger(request, 'api');

  if (!isAuthorized(request)) {
    logger.warn('admin.backfill.list.unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const jobs = await prisma.backfillJob.findMany({
      orderBy: { createdAt: 'desc' },
    });

    logger.info('admin.backfill.list', {
      metadata: { count: jobs.length },
    });

    return NextResponse.json({ data: jobs });
  } catch (error) {
    logger.error('admin.backfill.list.failed', error as Error);
    return NextResponse.json(
      { error: 'Failed to list backfill jobs' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const logger = createRequestLogger(request, 'api');

  if (!isAuthorized(request)) {
    logger.warn('admin.backfill.pause.unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { jobId, action } = body as { jobId: string; action: 'pause' };

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    if (action !== 'pause') {
      return NextResponse.json({ error: 'Only "pause" action is supported' }, { status: 400 });
    }

    const result = await pauseBackfill(jobId, prisma, logger);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    logger.error('admin.backfill.pause.failed', error as Error);
    return NextResponse.json(
      { error: 'Failed to pause backfill' },
      { status: 500 }
    );
  }
}
