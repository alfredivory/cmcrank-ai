export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { getCategories } from '@/lib/queries/tokens';
import type { CategoriesResponse } from '@/types/api';

export async function GET(request: Request) {
  const logger = createRequestLogger(request, 'api');
  const startTime = Date.now();

  try {
    const categories = await getCategories();

    const durationMs = Date.now() - startTime;
    logger.info('categories.list', {
      durationMs,
      metadata: { count: categories.length },
    });

    const response: CategoriesResponse = { data: categories };
    return NextResponse.json(response);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('categories.list.failed', error as Error, { durationMs });
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
