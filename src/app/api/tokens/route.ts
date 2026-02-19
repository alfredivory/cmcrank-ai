export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { getTokenList } from '@/lib/queries/tokens';
import type { TokenSortField, SortOrder, TokenListResponse } from '@/types/api';

const VALID_SORT_FIELDS: TokenSortField[] = ['rank', 'name', 'price', 'marketCap', 'volume24h', 'rankChange7d', 'rankChange30d'];
const VALID_ORDERS: SortOrder[] = ['asc', 'desc'];
const MAX_LIMIT = 1000;
const DEFAULT_LIMIT = 100;

export async function GET(request: Request) {
  const logger = createRequestLogger(request, 'api');
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);

    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
      MAX_LIMIT
    );
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0);
    const sortParam = searchParams.get('sort') ?? 'rank';
    const orderParam = searchParams.get('order') ?? 'asc';
    const category = searchParams.get('category') ?? undefined;
    const search = searchParams.get('search') ?? undefined;

    const sort = VALID_SORT_FIELDS.includes(sortParam as TokenSortField)
      ? (sortParam as TokenSortField)
      : 'rank';
    const order = VALID_ORDERS.includes(orderParam as SortOrder)
      ? (orderParam as SortOrder)
      : 'asc';

    const result = await getTokenList({ limit, offset, sort, order, category, search });

    const durationMs = Date.now() - startTime;
    logger.info('tokens.list', {
      durationMs,
      metadata: {
        count: result.tokens.length,
        total: result.pagination.total,
        limit,
        offset,
        sort,
        order,
        ...(category && { category }),
        ...(search && { search }),
      },
    });

    const response: TokenListResponse = { data: result };
    return NextResponse.json(response);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('tokens.list.failed', error as Error, { durationMs });
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}
