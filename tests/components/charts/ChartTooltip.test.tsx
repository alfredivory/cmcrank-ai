import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChartTooltip from '@/components/charts/ChartTooltip';

const mockPayload = [
  {
    payload: {
      date: '2026-02-18',
      rank: 1,
      marketCap: 1_000_000_000_000,
      price: 50000,
      volume24h: 30_000_000_000,
      circulatingSupply: 19000000,
    },
  },
];

describe('ChartTooltip', () => {
  it('renders all fields when active', () => {
    render(<ChartTooltip active={true} payload={mockPayload} />);

    expect(screen.getByText('2026-02-18')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('$50,000.00')).toBeInTheDocument();
    expect(screen.getByText('$1.00T')).toBeInTheDocument();
    expect(screen.getByText('$30.00B')).toBeInTheDocument();
    expect(screen.getByText('19,000,000')).toBeInTheDocument();
  });

  it('renders nothing when not active', () => {
    const { container } = render(<ChartTooltip active={false} payload={mockPayload} />);

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when payload is empty', () => {
    const { container } = render(<ChartTooltip active={true} payload={[]} />);

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when payload is undefined', () => {
    const { container } = render(<ChartTooltip active={true} />);

    expect(container.innerHTML).toBe('');
  });
});
