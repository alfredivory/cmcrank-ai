import { describe, it, expect } from 'vitest';
import { formatPrice, formatLargeNumber, formatRankChange } from '@/lib/format';

describe('formatPrice', () => {
  it('formats prices >= $1 with two decimal places', () => {
    expect(formatPrice(1234.56)).toBe('$1,234.56');
    expect(formatPrice(1)).toBe('$1.00');
    expect(formatPrice(99999.99)).toBe('$99,999.99');
  });

  it('formats prices between $0.01 and $1 with four decimal places', () => {
    expect(formatPrice(0.5)).toBe('$0.5000');
    expect(formatPrice(0.0123)).toBe('$0.0123');
    expect(formatPrice(0.01)).toBe('$0.0100');
  });

  it('formats very small prices with significant digits', () => {
    const result = formatPrice(0.00001234);
    expect(result).toMatch(/^\$0\.0000123/);
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });
});

describe('formatLargeNumber', () => {
  it('formats trillions', () => {
    expect(formatLargeNumber(1_230_000_000_000)).toBe('$1.23T');
    expect(formatLargeNumber(2_500_000_000_000)).toBe('$2.50T');
  });

  it('formats billions', () => {
    expect(formatLargeNumber(1_230_000_000)).toBe('$1.23B');
    expect(formatLargeNumber(456_000_000_000)).toBe('$456.00B');
  });

  it('formats millions', () => {
    expect(formatLargeNumber(456_000_000)).toBe('$456.00M');
    expect(formatLargeNumber(1_500_000)).toBe('$1.50M');
  });

  it('formats thousands', () => {
    expect(formatLargeNumber(789_000)).toBe('$789.00K');
    expect(formatLargeNumber(1_500)).toBe('$1.50K');
  });

  it('formats small numbers', () => {
    expect(formatLargeNumber(999)).toBe('$999.00');
    expect(formatLargeNumber(0)).toBe('$0.00');
  });
});

describe('formatRankChange', () => {
  it('formats positive changes (rank improved)', () => {
    expect(formatRankChange(5)).toBe('+5');
    expect(formatRankChange(100)).toBe('+100');
  });

  it('formats negative changes (rank declined)', () => {
    expect(formatRankChange(-3)).toBe('-3');
    expect(formatRankChange(-50)).toBe('-50');
  });

  it('formats zero change', () => {
    expect(formatRankChange(0)).toBe('0');
  });

  it('formats null (no data available)', () => {
    expect(formatRankChange(null)).toBe('—');
  });
});
