/**
 * Format a price for display.
 * - >= $1: two decimal places (e.g., $1,234.56)
 * - < $1 but >= $0.01: four decimal places (e.g., $0.0123)
 * - < $0.01: up to 8 significant digits after decimal (e.g., $0.00001234)
 */
export function formatPrice(value: number): string {
  if (value >= 1) {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (value >= 0.01) {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
  }
  // For very small numbers, find the first significant digit position
  if (value === 0) return '$0.00';
  const str = value.toFixed(20);
  const match = str.match(/^0\.(0*)/);
  const leadingZeros = match ? match[1].length : 0;
  const sigDigits = Math.max(leadingZeros + 4, 8);
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: sigDigits, maximumFractionDigits: sigDigits })}`;
}

/**
 * Format large numbers with suffixes.
 * - >= 1T: e.g., $1.23T
 * - >= 1B: e.g., $1.23B
 * - >= 1M: e.g., $456M
 * - >= 1K: e.g., $789K
 * - < 1K: plain number
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

/**
 * Format a rank change delta with sign.
 * Positive = rank improved (moved up, e.g., from 10 to 5 = delta -5 in rank, but +5 in improvement).
 * We treat negative delta (rank number decreased) as improvement.
 * Returns "+5", "-3", or "0" for no change.
 */
export function formatRankChange(delta: number | null): string {
  if (delta === null) return '—';
  if (delta === 0) return '0';
  // delta > 0 means rank improved (moved to a lower number)
  return delta > 0 ? `+${delta}` : `${delta}`;
}
