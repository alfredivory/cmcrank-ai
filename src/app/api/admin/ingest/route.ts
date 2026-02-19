export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCMCClient } from '@/lib/cmc';
import { createRequestLogger } from '@/lib/logger';
import { runDailyIngestion } from '@/workers/daily-ingestion';

function isAuthorized(request: Request): boolean {
  const secret = request.headers.get('x-admin-secret');
  const expected = process.env.ADMIN_API_SECRET;
  if (!expected) return false;
  return secret === expected;
}

export async function POST(request: Request) {
  const logger = createRequestLogger(request, 'api');

  if (!isAuthorized(request)) {
    logger.warn('admin.ingest.unauthorized');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    logger.info('admin.ingest.triggered');
    const cmcClient = getCMCClient(logger);
    const result = await runDailyIngestion(prisma, cmcClient, logger);

    return NextResponse.json({ data: result });
  } catch (error) {
    logger.error('admin.ingest.failed', error as Error);
    return NextResponse.json(
      { error: 'Ingestion failed' },
      { status: 500 }
    );
  }
}
