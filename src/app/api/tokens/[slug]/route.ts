export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { getTokenBySlug } from '@/lib/queries/tokens';
import type { TokenDetailResponse } from '@/types/api';

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
      logger.warn('tokens.detail.not_found', {
        metadata: { slug },
      });
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    const durationMs = Date.now() - startTime;
    logger.info('tokens.detail', {
      durationMs,
      tokenId: token.id,
      metadata: { slug, symbol: token.symbol },
    });

    const response: TokenDetailResponse = { data: token };
    return NextResponse.json(response);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('tokens.detail.failed', error as Error, {
      durationMs,
      metadata: { slug },
    });
    return NextResponse.json(
      { error: 'Failed to fetch token' },
      { status: 500 }
    );
  }
}
