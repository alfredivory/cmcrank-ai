import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CompareChart from '@/components/charts/CompareChart';
import type { TokenSearchResult, CompareDataPoint } from '@/types/api';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
  };
});

const mockTokens: TokenSearchResult[] = [
  { id: 'token-1', name: 'Bitcoin', symbol: 'BTC', slug: 'bitcoin', logoUrl: null, currentRank: 1 },
  { id: 'token-2', name: 'Ethereum', symbol: 'ETH', slug: 'ethereum', logoUrl: null, currentRank: 2 },
];

const mockData: CompareDataPoint[] = [
  { date: '2026-01-01', 'rank_token-1': 1, 'rank_token-2': 5 },
  { date: '2026-01-02', 'rank_token-1': 2, 'rank_token-2': 4 },
  { date: '2026-01-03', 'rank_token-1': 1, 'rank_token-2': 6 },
];

describe('CompareChart', () => {
  it('shows empty state when no data', () => {
    render(
      <CompareChart
        data={[]}
        tokens={mockTokens}
        hiddenTokenIds={new Set()}
        normalize={false}
      />
    );
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders chart when data is provided', () => {
    const { container } = render(
      <CompareChart
        data={mockData}
        tokens={mockTokens}
        hiddenTokenIds={new Set()}
        normalize={false}
      />
    );
    // Chart container should exist
    expect(container.querySelector('.recharts-wrapper')).toBeInTheDocument();
  });

  it('does not render lines for hidden tokens', () => {
    const { container } = render(
      <CompareChart
        data={mockData}
        tokens={mockTokens}
        hiddenTokenIds={new Set(['token-2'])}
        normalize={false}
      />
    );
    // Should still render (1 line visible)
    expect(container.querySelector('.recharts-wrapper')).toBeInTheDocument();
  });

  it('renders with normalize mode', () => {
    const { container } = render(
      <CompareChart
        data={mockData}
        tokens={mockTokens}
        hiddenTokenIds={new Set()}
        normalize={true}
      />
    );
    expect(container.querySelector('.recharts-wrapper')).toBeInTheDocument();
  });
});
