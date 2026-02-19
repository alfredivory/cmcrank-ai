import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TokenHeader from '@/components/tokens/TokenHeader';
import type { TokenDetailExtended } from '@/types/api';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

function createMockToken(overrides: Partial<TokenDetailExtended> = {}): TokenDetailExtended {
  return {
    id: 'token-1',
    cmcId: 1,
    name: 'Bitcoin',
    symbol: 'BTC',
    slug: 'bitcoin',
    logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png',
    currentRank: 1,
    price: 50000,
    marketCap: 1_000_000_000_000,
    volume24h: 30_000_000_000,
    rankChange7d: 0,
    rankChange30d: 2,
    rankChange90d: 5,
    categories: ['Store of Value', 'Layer 1'],
    ...overrides,
  };
}

describe('TokenHeader', () => {
  it('renders token name, symbol, and rank', () => {
    render(<TokenHeader token={createMockToken()} />);

    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('Rank #1')).toBeInTheDocument();
  });

  it('renders price and market cap', () => {
    render(<TokenHeader token={createMockToken()} />);

    expect(screen.getByText('$50,000.00')).toBeInTheDocument();
    expect(screen.getByText('$1.00T')).toBeInTheDocument();
  });

  it('renders volume 24h', () => {
    render(<TokenHeader token={createMockToken()} />);

    expect(screen.getByText('$30.00B')).toBeInTheDocument();
  });

  it('renders logo image when logoUrl is provided', () => {
    render(<TokenHeader token={createMockToken()} />);

    const img = screen.getByAltText('Bitcoin');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png');
  });

  it('renders fallback when logoUrl is null', () => {
    render(<TokenHeader token={createMockToken({ logoUrl: null })} />);

    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('renders positive rank change in green', () => {
    render(<TokenHeader token={createMockToken({ rankChange30d: 5 })} />);

    const changeElements = screen.getAllByText(/\+5/);
    expect(changeElements.length).toBeGreaterThan(0);
    expect(changeElements[0].closest('div')).toHaveClass('text-green-400');
  });

  it('renders negative rank change in red', () => {
    render(<TokenHeader token={createMockToken({ rankChange7d: -3 })} />);

    const changeElements = screen.getAllByText(/-3/);
    expect(changeElements.length).toBeGreaterThan(0);
    expect(changeElements[0].closest('div')).toHaveClass('text-red-400');
  });

  it('renders null rank change as dash', () => {
    render(<TokenHeader token={createMockToken({ rankChange90d: null })} />);

    // Should display — for null rank change
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('renders category tags', () => {
    render(<TokenHeader token={createMockToken()} />);

    expect(screen.getByText('Store of Value')).toBeInTheDocument();
    expect(screen.getByText('Layer 1')).toBeInTheDocument();
  });

  it('does not render categories section when empty', () => {
    render(<TokenHeader token={createMockToken({ categories: [] })} />);

    expect(screen.queryByText('Store of Value')).not.toBeInTheDocument();
  });
});
