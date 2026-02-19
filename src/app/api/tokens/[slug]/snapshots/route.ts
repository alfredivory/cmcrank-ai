export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { getTokenBySlug } from '@/lib/queries/tokens';
import { getSnapshotHistory } from '@/lib/queries/tokens';
import type { SnapshotTimeRange, SnapshotHistoryResponse } from '@/types/api';

const VALID_RANGES: SnapshotTimeRange[] = ['7d', '30d', '90d', '1y', 'all'];

function isValidDate(dateStr: string): boolean {
  const parsed = new Date(dateStr);
  return !isNaN(parsed.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

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
      logger.warn('tokens.snapshots.not_found', {
        metadata: { slug },
      });
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const startParam = url.searchParams.get('start');
    const endParam = url.searchParams.get('end');
    const rangeParam = url.searchParams.get('range');

    let snapshots;
    let rangeLabel: SnapshotTimeRange | 'custom';
    let startDate: string;
    let endDate: string;

    if (startParam && endParam) {
      if (!isValidDate(startParam) || !isValidDate(endParam)) {
        logger.warn('tokens.snapshots.invalid_dates', {
          metadata: { slug, start: startParam, end: endParam },
        });
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD.' },
          { status: 400 }
        );
      }
      const customStart = new Date(startParam);
      const customEnd = new Date(endParam);

      if (customStart > customEnd) {
        logger.warn('tokens.snapshots.invalid_range', {
          metadata: { slug, start: startParam, end: endParam },
        });
        return NextResponse.json(
          { error: 'Start date must be before end date.' },
          { status: 400 }
        );
      }

      snapshots = await getSnapshotHistory(token.id, 'all', customStart, customEnd);
      rangeLabel = 'custom';
      startDate = startParam;
      endDate = endParam;
    } else {
      const range = (rangeParam as SnapshotTimeRange) || '30d';
      if (!VALID_RANGES.includes(range)) {
        logger.warn('tokens.snapshots.invalid_range_param', {
          metadata: { slug, range: rangeParam },
        });
        return NextResponse.json(
          { error: `Invalid range. Use one of: ${VALID_RANGES.join(', ')}` },
          { status: 400 }
        );
      }

      snapshots = await getSnapshotHistory(token.id, range);
      rangeLabel = range;
      startDate = snapshots.length > 0 ? snapshots[0].date : '';
      endDate = snapshots.length > 0 ? snapshots[snapshots.length - 1].date : '';
    }

    const durationMs = Date.now() - startTime;
    logger.info('tokens.snapshots', {
      durationMs,
      tokenId: token.id,
      metadata: { slug, range: rangeLabel, count: snapshots.length },
    });

    const response: SnapshotHistoryResponse = {
      data: {
        tokenId: token.id,
        slug: token.slug,
        range: rangeLabel,
        startDate,
        endDate,
        snapshots,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('tokens.snapshots.failed', error as Error, {
      durationMs,
      metadata: { slug },
    });
    return NextResponse.json(
      { error: 'Failed to fetch snapshots' },
      { status: 500 }
    );
  }
}
