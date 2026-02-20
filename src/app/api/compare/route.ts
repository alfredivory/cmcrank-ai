export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { getTokensBySlugs, getSnapshotHistory } from '@/lib/queries/tokens';
import type { SnapshotTimeRange, CompareResponse } from '@/types/api';

const VALID_RANGES: SnapshotTimeRange[] = ['7d', '30d', '90d', '1y', 'all'];
const MAX_TOKENS = 5;

function isValidDate(dateStr: string): boolean {
  const parsed = new Date(dateStr);
  return !isNaN(parsed.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

export async function GET(request: Request) {
  const logger = createRequestLogger(request, 'api');
  const startTime = Date.now();

  try {
    const url = new URL(request.url);
    const tokensParam = url.searchParams.get('tokens');
    const rangeParam = url.searchParams.get('range');
    const startParam = url.searchParams.get('start');
    const endParam = url.searchParams.get('end');

    if (!tokensParam) {
      return NextResponse.json(
        { error: 'Missing tokens parameter' },
        { status: 400 }
      );
    }

    const slugs = tokensParam.split(',').map(s => s.trim()).filter(Boolean);

    if (slugs.length === 0) {
      return NextResponse.json(
        { error: 'No valid token slugs provided' },
        { status: 400 }
      );
    }

    if (slugs.length > MAX_TOKENS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_TOKENS} tokens allowed` },
        { status: 400 }
      );
    }

    const tokens = await getTokensBySlugs(slugs);

    if (tokens.length === 0) {
      return NextResponse.json(
        { error: 'No matching tokens found' },
        { status: 404 }
      );
    }

    let rangeLabel: SnapshotTimeRange | 'custom';
    let customStart: Date | undefined;
    let customEnd: Date | undefined;

    if (startParam && endParam) {
      if (!isValidDate(startParam) || !isValidDate(endParam)) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD.' },
          { status: 400 }
        );
      }
      customStart = new Date(startParam);
      customEnd = new Date(endParam);
      if (customStart > customEnd) {
        return NextResponse.json(
          { error: 'Start date must be before end date.' },
          { status: 400 }
        );
      }
      rangeLabel = 'custom';
    } else {
      const range = (rangeParam as SnapshotTimeRange) || '30d';
      if (!VALID_RANGES.includes(range)) {
        return NextResponse.json(
          { error: `Invalid range. Use one of: ${VALID_RANGES.join(', ')}` },
          { status: 400 }
        );
      }
      rangeLabel = range;
    }

    const snapshotResults = await Promise.all(
      tokens.map((token) =>
        getSnapshotHistory(
          token.id,
          rangeLabel === 'custom' ? 'all' : rangeLabel,
          customStart,
          customEnd,
        )
      )
    );

    const responseData: CompareResponse = {
      data: {
        tokens: tokens.map((token, i) => ({
          token,
          snapshots: snapshotResults[i],
        })),
        range: rangeLabel,
      },
    };

    const durationMs = Date.now() - startTime;
    logger.info('compare.fetch', {
      durationMs,
      metadata: {
        slugs,
        tokenCount: tokens.length,
        range: rangeLabel,
        snapshotCounts: snapshotResults.map(s => s.length),
      },
    });

    return NextResponse.json(responseData);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('compare.fetch.failed', error as Error, { durationMs });
    return NextResponse.json(
      { error: 'Failed to fetch comparison data' },
      { status: 500 }
    );
  }
}
