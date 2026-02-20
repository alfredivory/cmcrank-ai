import { describe, it, expect } from 'vitest';
import {
  COMPARE_COLORS,
  mergeSnapshotsForCompare,
  normalizeRankData,
} from '@/lib/chart-utils';
import type { SnapshotDataPoint, CompareDataPoint } from '@/types/api';

function makeSnap(date: string, rank: number): SnapshotDataPoint {
  return { date, rank, marketCap: 0, price: 0, volume24h: 0, circulatingSupply: 0 };
}

describe('COMPARE_COLORS', () => {
  it('has 5 distinct colors', () => {
    expect(COMPARE_COLORS).toHaveLength(5);
    const unique = new Set(COMPARE_COLORS);
    expect(unique.size).toBe(5);
  });
});

describe('mergeSnapshotsForCompare', () => {
  it('merges two tokens with identical date ranges', () => {
    const result = mergeSnapshotsForCompare([
      { tokenId: 'a', snapshots: [makeSnap('2026-01-01', 1), makeSnap('2026-01-02', 2)] },
      { tokenId: 'b', snapshots: [makeSnap('2026-01-01', 10), makeSnap('2026-01-02', 12)] },
    ]);

    expect(result).toEqual([
      { date: '2026-01-01', rank_a: 1, rank_b: 10 },
      { date: '2026-01-02', rank_a: 2, rank_b: 12 },
    ]);
  });

  it('fills nulls for tokens with different date ranges', () => {
    const result = mergeSnapshotsForCompare([
      { tokenId: 'a', snapshots: [makeSnap('2026-01-01', 1), makeSnap('2026-01-02', 2), makeSnap('2026-01-03', 3)] },
      { tokenId: 'b', snapshots: [makeSnap('2026-01-02', 10)] },
    ]);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ date: '2026-01-01', rank_a: 1, rank_b: null });
    expect(result[1]).toEqual({ date: '2026-01-02', rank_a: 2, rank_b: 10 });
    expect(result[2]).toEqual({ date: '2026-01-03', rank_a: 3, rank_b: null });
  });

  it('returns empty array for empty input', () => {
    expect(mergeSnapshotsForCompare([])).toEqual([]);
  });

  it('handles single token', () => {
    const result = mergeSnapshotsForCompare([
      { tokenId: 'a', snapshots: [makeSnap('2026-01-01', 5)] },
    ]);

    expect(result).toEqual([{ date: '2026-01-01', rank_a: 5 }]);
  });

  it('sorts dates chronologically', () => {
    const result = mergeSnapshotsForCompare([
      { tokenId: 'a', snapshots: [makeSnap('2026-01-03', 3), makeSnap('2026-01-01', 1)] },
    ]);

    expect(result[0].date).toBe('2026-01-01');
    expect(result[1].date).toBe('2026-01-03');
  });
});

describe('normalizeRankData', () => {
  it('normalizes to delta from first data point', () => {
    const data: CompareDataPoint[] = [
      { date: '2026-01-01', rank_a: 10, rank_b: 50 },
      { date: '2026-01-02', rank_a: 8, rank_b: 55 },
      { date: '2026-01-03', rank_a: 12, rank_b: 45 },
    ];

    const result = normalizeRankData(data, ['a', 'b']);

    expect(result[0]).toEqual({ date: '2026-01-01', rank_a: 0, rank_b: 0 });
    expect(result[1]).toEqual({ date: '2026-01-02', rank_a: -2, rank_b: 5 }); // a improved, b worsened
    expect(result[2]).toEqual({ date: '2026-01-03', rank_a: 2, rank_b: -5 }); // a worsened, b improved
  });

  it('handles nulls in data', () => {
    const data: CompareDataPoint[] = [
      { date: '2026-01-01', rank_a: 10, rank_b: null },
      { date: '2026-01-02', rank_a: 8, rank_b: 50 },
      { date: '2026-01-03', rank_a: null, rank_b: 45 },
    ];

    const result = normalizeRankData(data, ['a', 'b']);

    expect(result[0].rank_a).toBe(0);
    expect(result[0].rank_b).toBe(null); // no base value yet
    expect(result[1].rank_a).toBe(-2);
    expect(result[1].rank_b).toBe(0); // first non-null becomes base
    expect(result[2].rank_a).toBe(null);
    expect(result[2].rank_b).toBe(-5);
  });

  it('returns empty array for empty input', () => {
    expect(normalizeRankData([], ['a'])).toEqual([]);
  });

  it('handles token with all nulls', () => {
    const data: CompareDataPoint[] = [
      { date: '2026-01-01', rank_a: 10, rank_b: null },
      { date: '2026-01-02', rank_a: 8, rank_b: null },
    ];

    const result = normalizeRankData(data, ['a', 'b']);

    expect(result[0].rank_a).toBe(0);
    expect(result[0].rank_b).toBe(null);
    expect(result[1].rank_a).toBe(-2);
    expect(result[1].rank_b).toBe(null);
  });
});
