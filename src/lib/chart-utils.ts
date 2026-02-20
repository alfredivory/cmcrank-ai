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
