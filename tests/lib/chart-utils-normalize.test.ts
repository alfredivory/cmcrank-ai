import { describe, it, expect } from 'vitest';
import { mergeSnapshotsForMetric, normalizeMetricData } from '@/lib/chart-utils';
import type { SnapshotDataPoint, ChartOverlay } from '@/types/api';

function snap(date: string, overrides: Partial<SnapshotDataPoint> = {}): SnapshotDataPoint {
  return {
    date,
    rank: 10,
    marketCap: 1000000,
    price: 1.5,
    volume24h: 500000,
    circulatingSupply: 1000000,
    ...overrides,
  };
}

describe('mergeSnapshotsForMetric', () => {
  it('merges rank data for multiple tokens', () => {
    const result = mergeSnapshotsForMetric(
      [
        { tokenId: 'a', snapshots: [snap('2026-01-01', { rank: 5 }), snap('2026-01-02', { rank: 8 })] },
        { tokenId: 'b', snapshots: [snap('2026-01-01', { rank: 10 }), snap('2026-01-02', { rank: 12 })] },
      ],
      'rank',
    );

    expect(result).toEqual([
      { date: '2026-01-01', rank_a: 5, rank_b: 10 },
      { date: '2026-01-02', rank_a: 8, rank_b: 12 },
    ]);
  });

  it('merges price data with correct keys', () => {
    const result = mergeSnapshotsForMetric(
      [
        { tokenId: 'x', snapshots: [snap('2026-01-01', { price: 50 })] },
      ],
      'price',
    );

    expect(result).toEqual([
      { date: '2026-01-01', price_x: 50 },
    ]);
  });

  it('fills null for missing dates', () => {
    const result = mergeSnapshotsForMetric(
      [
        { tokenId: 'a', snapshots: [snap('2026-01-01', { marketCap: 100 })] },
        { tokenId: 'b', snapshots: [snap('2026-01-02', { marketCap: 200 })] },
      ],
      'marketCap',
    );

    expect(result).toEqual([
      { date: '2026-01-01', marketCap_a: 100, marketCap_b: null },
      { date: '2026-01-02', marketCap_a: null, marketCap_b: 200 },
    ]);
  });

  it('handles empty token snapshots', () => {
    const result = mergeSnapshotsForMetric(
      [
        { tokenId: 'a', snapshots: [snap('2026-01-01', { volume24h: 1000 })] },
        { tokenId: 'b', snapshots: [] },
      ],
      'volume24h',
    );

    expect(result).toEqual([
      { date: '2026-01-01', volume24h_a: 1000, volume24h_b: null },
    ]);
  });

  it('returns empty array when all inputs are empty', () => {
    const result = mergeSnapshotsForMetric([], 'rank');
    expect(result).toEqual([]);
  });

  it('sorts dates in ascending order', () => {
    const result = mergeSnapshotsForMetric(
      [
        { tokenId: 'a', snapshots: [snap('2026-01-03', { price: 3 }), snap('2026-01-01', { price: 1 })] },
      ],
      'price',
    );

    expect(result[0].date).toBe('2026-01-01');
    expect(result[1].date).toBe('2026-01-03');
  });

  it('works with circulatingSupply metric', () => {
    const result = mergeSnapshotsForMetric(
      [
        { tokenId: 'a', snapshots: [snap('2026-01-01', { circulatingSupply: 999999 })] },
      ],
      'circulatingSupply',
    );

    expect(result).toEqual([
      { date: '2026-01-01', circulatingSupply_a: 999999 },
    ]);
  });
});

describe('normalizeMetricData', () => {
  describe('rank normalization', () => {
    it('normalizes rank to delta from start (positive = improved)', () => {
      const data = [
        { date: '2026-01-01', rank_a: 10, rank_b: 20 },
        { date: '2026-01-02', rank_a: 5, rank_b: 25 },
        { date: '2026-01-03', rank_a: 15, rank_b: 18 },
      ];

      const result = normalizeMetricData(data, ['a', 'b'], 'rank');

      expect(result).toEqual([
        { date: '2026-01-01', rank_a: 0, rank_b: 0 },
        { date: '2026-01-02', rank_a: 5, rank_b: -5 },   // a improved 5 positions, b worsened 5
        { date: '2026-01-03', rank_a: -5, rank_b: 2 },    // a worsened 5, b improved 2
      ]);
    });

    it('starts at zero for all tokens', () => {
      const data = [
        { date: '2026-01-01', rank_a: 100, rank_b: 1 },
      ];

      const result = normalizeMetricData(data, ['a', 'b'], 'rank');

      expect(result[0].rank_a).toBe(0);
      expect(result[0].rank_b).toBe(0);
    });
  });

  describe('price normalization', () => {
    it('normalizes to percentage (starts at 100%)', () => {
      const data = [
        { date: '2026-01-01', price_a: 50, price_b: 2 },
        { date: '2026-01-02', price_a: 75, price_b: 1 },
      ];

      const result = normalizeMetricData(data, ['a', 'b'], 'price');

      expect(result).toEqual([
        { date: '2026-01-01', price_a: 100, price_b: 100 },
        { date: '2026-01-02', price_a: 150, price_b: 50 },
      ]);
    });
  });

  describe('marketCap normalization', () => {
    it('normalizes to percentage', () => {
      const data = [
        { date: '2026-01-01', marketCap_a: 1000000 },
        { date: '2026-01-02', marketCap_a: 1250000 },
      ];

      const result = normalizeMetricData(data, ['a'], 'marketCap');

      expect(result[0].marketCap_a).toBe(100);
      expect(result[1].marketCap_a).toBe(125);
    });
  });

  describe('null handling', () => {
    it('preserves null values', () => {
      const data = [
        { date: '2026-01-01', price_a: 50, price_b: null },
        { date: '2026-01-02', price_a: 75, price_b: 100 },
      ];

      const result = normalizeMetricData(data, ['a', 'b'], 'price');

      expect(result[0].price_b).toBeNull();
      // b starts from day 2 value (100), so day 2 = 100%
      expect(result[1].price_b).toBe(100);
    });

    it('handles division by zero (start=0) for non-rank metrics', () => {
      const data = [
        { date: '2026-01-01', volume24h_a: 0 },
        { date: '2026-01-02', volume24h_a: 500 },
      ];

      const result = normalizeMetricData(data, ['a'], 'volume24h');

      // Division by zero → all values null
      expect(result[0].volume24h_a).toBeNull();
      expect(result[1].volume24h_a).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles empty data', () => {
      const result = normalizeMetricData([], ['a'], 'rank');
      expect(result).toEqual([]);
    });

    it('handles single data point', () => {
      const data = [{ date: '2026-01-01', rank_a: 10 }];
      const result = normalizeMetricData(data, ['a'], 'rank');
      expect(result).toEqual([{ date: '2026-01-01', rank_a: 0 }]);
    });

    it('works with all five metrics', () => {
      const metrics: ChartOverlay[] = ['rank', 'marketCap', 'price', 'volume24h', 'circulatingSupply'];

      for (const metric of metrics) {
        const data = [
          { date: '2026-01-01', [`${metric}_a`]: 100 },
          { date: '2026-01-02', [`${metric}_a`]: 200 },
        ];

        const result = normalizeMetricData(data, ['a'], metric);
        expect(result).toHaveLength(2);
        // First value should be baseline (0 for rank, 100% for others)
        if (metric === 'rank') {
          expect(result[0][`${metric}_a`]).toBe(0);
        } else {
          expect(result[0][`${metric}_a`]).toBe(100);
        }
      }
    });
  });
});
