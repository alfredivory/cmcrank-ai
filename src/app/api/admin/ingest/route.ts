export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCMCClient } from '@/lib/cmc';
import { createRequestLogger } from '@/lib/logger';
import { runDailyIngestion } from '@/workers/daily-ingestion';
import { requireAdminDual, isAuthError } from '@/lib/auth/helpers';

export async function POST(request: Request) {
  const logger = createRequestLogger(request, 'api');

  const authResult = await requireAdminDual(request);
  if (isAuthError(authResult)) {
    logger.warn('admin.ingest.unauthorized');
    return authResult;
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
