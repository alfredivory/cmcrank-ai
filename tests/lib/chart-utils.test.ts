import { describe, it, expect } from 'vitest';
import { computeUniformTicks } from '@/lib/chart-utils';

/** Generate an array of consecutive YYYY-MM-DD date strings starting from a date. */
function generateDailyDates(start: string, count: number): string[] {
  const dates: string[] = [];
  const d = new Date(start + 'T00:00:00Z');
  for (let i = 0; i < count; i++) {
    dates.push(d.toISOString().split('T')[0]);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

/** Parse YYYY-MM-DD to day count since epoch for distance calculation. */
function toDayNumber(dateStr: string): number {
  return Math.round(new Date(dateStr + 'T00:00:00Z').getTime() / 86400000);
}

/** Compute distances (in days) between consecutive ticks. */
function tickDistances(ticks: string[]): number[] {
  const distances: number[] = [];
  for (let i = 1; i < ticks.length; i++) {
    distances.push(toDayNumber(ticks[i]) - toDayNumber(ticks[i - 1]));
  }
  return distances;
}

describe('computeUniformTicks', () => {
  // === Edge cases ===

  it('returns empty array for empty input', () => {
    expect(computeUniformTicks([])).toEqual([]);
  });

  it('returns single date for single-element input', () => {
    expect(computeUniformTicks(['2026-01-01'])).toEqual(['2026-01-01']);
  });

  it('returns both dates for two-element input', () => {
    expect(computeUniformTicks(['2026-01-01', '2026-01-02'])).toEqual(['2026-01-01', '2026-01-02']);
  });

  it('returns all dates when count <= maxTicks', () => {
    const dates = generateDailyDates('2026-01-01', 8);
    const ticks = computeUniformTicks(dates, 10);
    expect(ticks).toEqual(dates);
  });

  it('returns all dates when count equals maxTicks', () => {
    const dates = generateDailyDates('2026-01-01', 10);
    const ticks = computeUniformTicks(dates, 10);
    expect(ticks).toEqual(dates);
  });

  // === Always includes first and last ===

  it('always includes the first date', () => {
    const dates = generateDailyDates('2026-01-01', 31);
    const ticks = computeUniformTicks(dates, 8);
    expect(ticks[0]).toBe('2026-01-01');
  });

  it('always includes the last date', () => {
    const dates = generateDailyDates('2026-01-01', 31);
    const ticks = computeUniformTicks(dates, 8);
    expect(ticks[ticks.length - 1]).toBe('2026-01-31');
  });

  // === Uniform middle distances ===

  it('produces equal middle distances for 31 days / 8 ticks', () => {
    const dates = generateDailyDates('2026-01-01', 31);
    const ticks = computeUniformTicks(dates, 8);
    const distances = tickDistances(ticks);

    // Middle distances (all except first and last) must be equal
    const middleDistances = distances.slice(1, -1);
    expect(middleDistances.length).toBeGreaterThan(0);
    const middleStep = middleDistances[0];
    for (const d of middleDistances) {
      expect(d).toBe(middleStep);
    }
  });

  it('produces equal middle distances for 90 days / 10 ticks', () => {
    const dates = generateDailyDates('2025-11-01', 90);
    const ticks = computeUniformTicks(dates, 10);
    const distances = tickDistances(ticks);

    const middleDistances = distances.slice(1, -1);
    expect(middleDistances.length).toBeGreaterThan(0);
    const middleStep = middleDistances[0];
    for (const d of middleDistances) {
      expect(d).toBe(middleStep);
    }
  });

  it('produces equal middle distances for 365 days / 10 ticks', () => {
    const dates = generateDailyDates('2025-02-01', 365);
    const ticks = computeUniformTicks(dates, 10);
    const distances = tickDistances(ticks);

    const middleDistances = distances.slice(1, -1);
    expect(middleDistances.length).toBeGreaterThan(0);
    const middleStep = middleDistances[0];
    for (const d of middleDistances) {
      expect(d).toBe(middleStep);
    }
  });

  it('produces equal middle distances for 730 days / 10 ticks', () => {
    const dates = generateDailyDates('2024-02-20', 730);
    const ticks = computeUniformTicks(dates, 10);
    const distances = tickDistances(ticks);

    const middleDistances = distances.slice(1, -1);
    expect(middleDistances.length).toBeGreaterThan(0);
    const middleStep = middleDistances[0];
    for (const d of middleDistances) {
      expect(d).toBe(middleStep);
    }
  });

  // === Edge distances <= middle distance ===

  it('first distance <= middle distance for 31 days', () => {
    const dates = generateDailyDates('2026-01-01', 31);
    const ticks = computeUniformTicks(dates, 8);
    const distances = tickDistances(ticks);

    const middleStep = distances.length > 2 ? distances[1] : distances[0];
    expect(distances[0]).toBeLessThanOrEqual(middleStep);
  });

  it('last distance <= middle distance for 31 days', () => {
    const dates = generateDailyDates('2026-01-01', 31);
    const ticks = computeUniformTicks(dates, 8);
    const distances = tickDistances(ticks);

    const middleStep = distances.length > 2 ? distances[1] : distances[0];
    expect(distances[distances.length - 1]).toBeLessThanOrEqual(middleStep);
  });

  it('edge distances <= middle distance for 90 days', () => {
    const dates = generateDailyDates('2025-11-01', 90);
    const ticks = computeUniformTicks(dates, 10);
    const distances = tickDistances(ticks);

    const middleStep = distances[1];
    expect(distances[0]).toBeLessThanOrEqual(middleStep);
    expect(distances[distances.length - 1]).toBeLessThanOrEqual(middleStep);
  });

  it('edge distances <= middle distance for 365 days', () => {
    const dates = generateDailyDates('2025-02-01', 365);
    const ticks = computeUniformTicks(dates, 10);
    const distances = tickDistances(ticks);

    const middleStep = distances[1];
    expect(distances[0]).toBeLessThanOrEqual(middleStep);
    expect(distances[distances.length - 1]).toBeLessThanOrEqual(middleStep);
  });

  it('edge distances <= middle distance for 730 days', () => {
    const dates = generateDailyDates('2024-02-20', 730);
    const ticks = computeUniformTicks(dates, 10);
    const distances = tickDistances(ticks);

    const middleStep = distances[1];
    expect(distances[0]).toBeLessThanOrEqual(middleStep);
    expect(distances[distances.length - 1]).toBeLessThanOrEqual(middleStep);
  });

  // === Tick count is reasonable ===

  it('does not exceed maxTicks', () => {
    const dates = generateDailyDates('2024-02-20', 730);
    const ticks = computeUniformTicks(dates, 10);
    expect(ticks.length).toBeLessThanOrEqual(10 + 1); // +1 for potential prepended first date
  });

  it('produces at least 2 ticks for non-trivial input', () => {
    const dates = generateDailyDates('2026-01-01', 31);
    const ticks = computeUniformTicks(dates, 8);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
  });

  // === All ticks exist in the input data ===

  it('all ticks are valid dates from the input array for 31 days', () => {
    const dates = generateDailyDates('2026-01-01', 31);
    const ticks = computeUniformTicks(dates, 8);
    for (const tick of ticks) {
      expect(dates).toContain(tick);
    }
  });

  it('all ticks are valid dates from the input array for 365 days', () => {
    const dates = generateDailyDates('2025-02-01', 365);
    const ticks = computeUniformTicks(dates, 10);
    for (const tick of ticks) {
      expect(dates).toContain(tick);
    }
  });

  // === Different maxTicks values ===

  it('works with maxTicks=5', () => {
    const dates = generateDailyDates('2026-01-01', 31);
    const ticks = computeUniformTicks(dates, 5);
    const distances = tickDistances(ticks);

    const middleDistances = distances.slice(1, -1);
    if (middleDistances.length > 0) {
      const middleStep = middleDistances[0];
      for (const d of middleDistances) {
        expect(d).toBe(middleStep);
      }
      expect(distances[0]).toBeLessThanOrEqual(middleStep);
      expect(distances[distances.length - 1]).toBeLessThanOrEqual(middleStep);
    }
  });

  it('works with maxTicks=15', () => {
    const dates = generateDailyDates('2024-02-20', 730);
    const ticks = computeUniformTicks(dates, 15);
    const distances = tickDistances(ticks);

    const middleDistances = distances.slice(1, -1);
    if (middleDistances.length > 0) {
      const middleStep = middleDistances[0];
      for (const d of middleDistances) {
        expect(d).toBe(middleStep);
      }
      expect(distances[0]).toBeLessThanOrEqual(middleStep);
      expect(distances[distances.length - 1]).toBeLessThanOrEqual(middleStep);
    }
  });

  // === Handles data with gaps ===

  it('snaps to closest actual dates when data has gaps', () => {
    // Daily data but with a 3-day gap in the middle
    const dates = [
      '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05',
      // gap: 06, 07, 08 missing
      '2026-01-09', '2026-01-10', '2026-01-11', '2026-01-12', '2026-01-13',
      '2026-01-14', '2026-01-15', '2026-01-16', '2026-01-17', '2026-01-18',
      '2026-01-19', '2026-01-20',
    ];
    const ticks = computeUniformTicks(dates, 5);

    // All ticks must exist in the data
    for (const tick of ticks) {
      expect(dates).toContain(tick);
    }

    // First and last must be included
    expect(ticks[0]).toBe('2026-01-01');
    expect(ticks[ticks.length - 1]).toBe('2026-01-20');
  });
});
