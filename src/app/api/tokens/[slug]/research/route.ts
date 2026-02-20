export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { getTokenBySlug } from '@/lib/queries/tokens';
import { getResearchForToken } from '@/lib/queries/research';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const logger = createRequestLogger(request, 'api');
  const startTime = Date.now();
  const { slug } = await params;

  try {
    const token = await getTokenBySlug(slug);

    if (!token) {
      logger.warn('tokens.research.not_found', {
        metadata: { slug },
      });
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 50);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

    const { items, total } = await getResearchForToken(token.id, { limit, offset });

    logger.info('tokens.research.list', {
      durationMs: Date.now() - startTime,
      tokenId: token.id,
      metadata: { slug, count: items.length, total },
    });

    return NextResponse.json({
      data: {
        items: items.map((item) => ({
          id: item.id,
          dateRangeStart: item.dateRangeStart.toISOString().split('T')[0],
          dateRangeEnd: item.dateRangeEnd.toISOString().split('T')[0],
          status: item.status,
          importanceScore: item.importanceScore,
          createdAt: item.createdAt.toISOString(),
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error) {
    logger.error('tokens.research.failed', error as Error, {
      durationMs: Date.now() - startTime,
      metadata: { slug },
    });
    return NextResponse.json(
      { error: 'Failed to fetch research list' },
      { status: 500 }
    );
  }
}
