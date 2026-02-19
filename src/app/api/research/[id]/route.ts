export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { getResearchById } from '@/lib/queries/research';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createRequestLogger(request, 'api');
  const startTime = Date.now();
  const { id } = await params;

  try {
    const research = await getResearchById(id);

    if (!research) {
      logger.warn('research.detail.not_found', {
        metadata: { id },
      });
      return NextResponse.json({ error: 'Research not found' }, { status: 404 });
    }

    logger.info('research.detail', {
      durationMs: Date.now() - startTime,
      metadata: { id, status: research.status },
    });

    // Serialize dates for API response
    return NextResponse.json({
      data: {
        id: research.id,
        title: research.title,
        tokenId: research.tokenId,
        dateRangeStart: research.dateRangeStart.toISOString().split('T')[0],
        dateRangeEnd: research.dateRangeEnd.toISOString().split('T')[0],
        status: research.status,
        content: research.content,
        renderedMarkdown: research.renderedMarkdown,
        importanceScore: research.importanceScore,
        userContext: research.userContext,
        parentResearchId: research.parentResearchId,
        createdAt: research.createdAt.toISOString(),
        updatedAt: research.updatedAt.toISOString(),
        token: research.token,
        events: research.events.map((ev) => ({
          ...ev,
          eventDate: ev.eventDate.toISOString().split('T')[0],
        })),
      },
    });
  } catch (error) {
    logger.error('research.detail.failed', error as Error, {
      durationMs: Date.now() - startTime,
      metadata: { id },
    });
    return NextResponse.json(
      { error: 'Failed to fetch research' },
      { status: 500 }
    );
  }
}
