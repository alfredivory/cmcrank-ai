import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChartTooltip from '@/components/charts/ChartTooltip';
import type { SnapshotDataPoint } from '@/types/api';

const mockData: SnapshotDataPoint = {
  date: '2026-02-18',
  rank: 1,
  marketCap: 1_000_000_000_000,
  price: 50000,
  volume24h: 30_000_000_000,
  circulatingSupply: 19000000,
};

describe('ChartTooltip', () => {
  it('renders all fields when data is provided', () => {
    render(<ChartTooltip data={mockData} />);

    expect(screen.getByText('2026-02-18')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('$50,000.00')).toBeInTheDocument();
    expect(screen.getByText('$1.00T')).toBeInTheDocument();
    expect(screen.getByText('$30.00B')).toBeInTheDocument();
    expect(screen.getByText('19,000,000')).toBeInTheDocument();
  });

  it('renders nothing when data is null', () => {
    const { container } = render(<ChartTooltip data={null} />);

    expect(container.innerHTML).toBe('');
  });
});
