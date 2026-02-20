export type RankMovement = 'positive' | 'negative' | 'neutral';

export const MOVEMENT_COLORS: Record<RankMovement, { fill: string; stroke: string }> = {
  positive: { fill: '#22c55e', stroke: '#22c55e' },  // green-500
  negative: { fill: '#ef4444', stroke: '#ef4444' },  // red-500
  neutral:  { fill: '#eab308', stroke: '#eab308' },  // yellow-500
};

/**
 * Determine whether a token's rank improved, worsened, or stayed flat
 * during a date range by comparing the first and last rank snapshots.
 *
 * Returns 'positive' if rank improved by >5%, 'negative' if worsened by >5%,
 * otherwise 'neutral'. Lower rank numbers are better (rank 1 = top).
 */
export function computeRankMovement(
  snapshots: { date: string; rank: number }[],
  startDate: string,
  endDate: string,
): RankMovement {
  const inRange = snapshots.filter(s => s.date >= startDate && s.date <= endDate);
  if (inRange.length < 2) return 'neutral';

  const firstRank = inRange[0].rank;
  const lastRank = inRange[inRange.length - 1].rank;

  // Avoid division by zero
  if (firstRank === 0) return 'neutral';

  const changeRatio = (lastRank - firstRank) / firstRank;

  // Rank decreased (number got smaller) → improved → positive
  if (changeRatio < -0.05) return 'positive';
  // Rank increased (number got larger) → worsened → negative
  if (changeRatio > 0.05) return 'negative';
  return 'neutral';
}

/**
 * Compute evenly-spaced tick dates for chart X-axis.
 *
 * Algorithm: "generate from end" — anchors to the last date and walks
 * backwards at a uniform step, then prepends the first date. This ensures:
 * - All middle intervals are exactly equal (in days)
 * - Edge intervals (first and last) are <= the middle step
 * - The most recent date always has a tick label
 *
 * Ticks are snapped to the closest actual date in the data array to
 * handle potential gaps in daily data.
 */
export function computeUniformTicks(dates: string[], maxTicks: number = 10): string[] {
  if (dates.length <= maxTicks) return dates;

  const first = dates[0];
  const last = dates[dates.length - 1];
  const totalDays = daysBetween(first, last);

  if (totalDays === 0) return [first];

  const step = Math.ceil(totalDays / (maxTicks - 1));

  // Walk backwards from the last date at uniform step intervals
  const lastMs = toUTCMs(last);
  const generated: number[] = [];
  let current = lastMs;
  const firstMs = toUTCMs(first);

  while (current > firstMs) {
    generated.push(current);
    current -= step * 86400000;
  }

  // Reverse so ticks go chronologically
  generated.reverse();

  // Prepend first date if it's not already covered
  if (generated.length === 0 || generated[0] !== firstMs) {
    generated.unshift(firstMs);
  }

  // Append last date if not already there (should be, but guard)
  if (generated[generated.length - 1] !== lastMs) {
    generated.push(lastMs);
  }

  // Snap each generated tick to the closest actual date in the data
  return generated.map((ms) => findClosestDate(dates, ms));
}

function toUTCMs(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00Z').getTime();
}

function daysBetween(a: string, b: string): number {
  return Math.round((toUTCMs(b) - toUTCMs(a)) / 86400000);
}

function findClosestDate(dates: string[], targetMs: number): string {
  let closest = dates[0];
  let closestDist = Math.abs(toUTCMs(closest) - targetMs);

  for (let i = 1; i < dates.length; i++) {
    const dist = Math.abs(toUTCMs(dates[i]) - targetMs);
    if (dist < closestDist) {
      closest = dates[i];
      closestDist = dist;
    }
    // Since dates are sorted ascending, once distance starts increasing we can stop
    if (dist > closestDist) break;
  }

  return closest;
}

// ============================================================================
// Compare Chart Utilities
// ============================================================================

import type { SnapshotDataPoint, CompareDataPoint, ChartOverlay } from '@/types/api';

export const COMPARE_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'] as const;

/** Map ChartOverlay to SnapshotDataPoint field name */
const METRIC_FIELD: Record<ChartOverlay, keyof SnapshotDataPoint> = {
  rank: 'rank',
  marketCap: 'marketCap',
  price: 'price',
  volume24h: 'volume24h',
  circulatingSupply: 'circulatingSupply',
};

/**
 * Merge multiple tokens' snapshot arrays into a single array indexed by date.
 * Each row contains `{ date, rank_<tokenId>: number | null }`.
 * Tokens with different date ranges produce nulls for missing dates.
 */
export function mergeSnapshotsForCompare(
  tokenSnapshots: { tokenId: string; snapshots: SnapshotDataPoint[] }[],
): CompareDataPoint[] {
  const dateSet = new Set<string>();
  const snapshotMap = new Map<string, Map<string, number>>();

  for (const { tokenId, snapshots } of tokenSnapshots) {
    const byDate = new Map<string, number>();
    for (const snap of snapshots) {
      dateSet.add(snap.date);
      byDate.set(snap.date, snap.rank);
    }
    snapshotMap.set(tokenId, byDate);
  }

  const sortedDates = Array.from(dateSet).sort();

  return sortedDates.map((date) => {
    const point: CompareDataPoint = { date };
    for (const { tokenId } of tokenSnapshots) {
      const byDate = snapshotMap.get(tokenId);
      point[`rank_${tokenId}`] = byDate?.get(date) ?? null;
    }
    return point;
  });
}

/**
 * Normalize rank data so each token starts at 0.
 * Negative delta = rank improved (rank number decreased).
 * Positive delta = rank worsened (rank number increased).
 */
export function normalizeRankData(
  data: CompareDataPoint[],
  tokenIds: string[],
): CompareDataPoint[] {
  const firstValues = new Map<string, number>();

  for (const tokenId of tokenIds) {
    const key = `rank_${tokenId}`;
    for (const point of data) {
      const val = point[key];
      if (typeof val === 'number') {
        firstValues.set(tokenId, val);
        break;
      }
    }
  }

  return data.map((point) => {
    const normalized: CompareDataPoint = { date: point.date };
    for (const tokenId of tokenIds) {
      const key = `rank_${tokenId}`;
      const val = point[key];
      const base = firstValues.get(tokenId);
      if (typeof val === 'number' && base !== undefined) {
        normalized[key] = val - base;
      } else {
        normalized[key] = null;
      }
    }
    return normalized;
  });
}

/**
 * Merge multiple tokens' snapshot arrays into a single array indexed by date,
 * using an arbitrary metric field instead of hardcoded rank.
 * Each row: `{ date, <metric>_<tokenId>: number | null }`.
 */
export function mergeSnapshotsForMetric(
  tokenSnapshots: { tokenId: string; snapshots: SnapshotDataPoint[] }[],
  metric: ChartOverlay,
): CompareDataPoint[] {
  const field = METRIC_FIELD[metric];
  const dateSet = new Set<string>();
  const snapshotMap = new Map<string, Map<string, number>>();

  for (const { tokenId, snapshots } of tokenSnapshots) {
    const byDate = new Map<string, number>();
    for (const snap of snapshots) {
      dateSet.add(snap.date);
      byDate.set(snap.date, snap[field] as number);
    }
    snapshotMap.set(tokenId, byDate);
  }

  const sortedDates = Array.from(dateSet).sort();

  return sortedDates.map((date) => {
    const point: CompareDataPoint = { date };
    for (const { tokenId } of tokenSnapshots) {
      const byDate = snapshotMap.get(tokenId);
      point[`${metric}_${tokenId}`] = byDate?.get(date) ?? null;
    }
    return point;
  });
}

/**
 * Normalize metric data so all tokens share a common baseline.
 *
 * - Rank: `delta = startRank - currentRank`
 *   Positive = improved (moved up), negative = worsened (moved down). Starts at 0.
 * - All others: `percentage = (current / start) * 100`
 *   Starts at 100%. Division-by-zero (start=0) → null.
 */
export function normalizeMetricData(
  data: CompareDataPoint[],
  tokenIds: string[],
  metric: ChartOverlay,
): CompareDataPoint[] {
  const firstValues = new Map<string, number>();

  for (const tokenId of tokenIds) {
    const key = `${metric}_${tokenId}`;
    for (const point of data) {
      const val = point[key];
      if (typeof val === 'number') {
        firstValues.set(tokenId, val);
        break;
      }
    }
  }

  const isRank = metric === 'rank';

  return data.map((point) => {
    const normalized: CompareDataPoint = { date: point.date };
    for (const tokenId of tokenIds) {
      const key = `${metric}_${tokenId}`;
      const val = point[key];
      const base = firstValues.get(tokenId);
      if (typeof val === 'number' && base !== undefined) {
        if (isRank) {
          // Positive = improved (rank number decreased from start)
          normalized[key] = base - val;
        } else {
          // Percentage relative to start value
          if (base === 0) {
            normalized[key] = null;
          } else {
            normalized[key] = (val / base) * 100;
          }
        }
      } else {
        normalized[key] = null;
      }
    }
    return normalized;
  });
}
