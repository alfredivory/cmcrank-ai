export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { getResearchStatus } from '@/lib/queries/research';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createRequestLogger(request, 'api');
  const { id } = await params;

  try {
    const status = await getResearchStatus(id);

    if (!status) {
      return NextResponse.json({ error: 'Research not found' }, { status: 404 });
    }

    logger.debug('research.status', {
      metadata: { id, status: status.status },
    });

    return NextResponse.json({
      data: {
        id: status.id,
        status: status.status,
        importanceScore: status.importanceScore,
        updatedAt: status.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error('research.status.failed', error as Error, {
      metadata: { id },
    });
    return NextResponse.json(
      { error: 'Failed to fetch research status' },
      { status: 500 }
    );
  }
}
