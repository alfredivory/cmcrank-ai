import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; width: number; height: number; className?: string }) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

import TokenTable from '@/components/tokens/TokenTable';
import type { TokenListItem, Pagination, CategoryItem } from '@/types/api';

function createMockToken(overrides: Partial<TokenListItem> = {}): TokenListItem {
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
    categories: ['Store of Value'],
    ...overrides,
  };
}

const mockPagination: Pagination = {
  total: 2,
  limit: 100,
  offset: 0,
  hasMore: false,
};

const mockCategories: CategoryItem[] = [
  { name: 'Layer 1', count: 50 },
  { name: 'DeFi', count: 30 },
];

describe('TokenTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for client-side requests
    global.fetch = vi.fn();
  });

  it('renders token rows with correct data', () => {
    const btc = createMockToken();
    const eth = createMockToken({
      id: 'token-2',
      cmcId: 1027,
      name: 'Ethereum',
      symbol: 'ETH',
      slug: 'ethereum',
      currentRank: 2,
      price: 3000,
      marketCap: 350_000_000_000,
      volume24h: 15_000_000_000,
      rankChange7d: 1,
      rankChange30d: -3,
    });

    render(
      <TokenTable
        initialTokens={[btc, eth]}
        initialPagination={mockPagination}
        categories={mockCategories}
      />
    );

    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('Ethereum')).toBeInTheDocument();
    expect(screen.getByText('ETH')).toBeInTheDocument();
  });

  it('renders rank change colors correctly', () => {
    const token = createMockToken({
      rankChange7d: 5,   // improved → green
      rankChange30d: -3,  // declined → red
    });

    render(
      <TokenTable
        initialTokens={[token]}
        initialPagination={{ ...mockPagination, total: 1 }}
        categories={mockCategories}
      />
    );

    // Check green for positive rank change
    const greenElements = screen.getAllByText(/\+5/);
    expect(greenElements.length).toBeGreaterThan(0);
    expect(greenElements[0].closest('span')).toHaveClass('text-green-400');

    // Check red for negative rank change
    const redElements = screen.getAllByText(/-3/);
    expect(redElements.length).toBeGreaterThan(0);
    expect(redElements[0].closest('span')).toHaveClass('text-red-400');
  });

  it('renders search input', () => {
    render(
      <TokenTable
        initialTokens={[]}
        initialPagination={{ ...mockPagination, total: 0 }}
        categories={mockCategories}
      />
    );

    expect(screen.getByPlaceholderText('Search tokens...')).toBeInTheDocument();
  });

  it('renders category dropdown with options', () => {
    render(
      <TokenTable
        initialTokens={[]}
        initialPagination={{ ...mockPagination, total: 0 }}
        categories={mockCategories}
      />
    );

    expect(screen.getByText('All Categories')).toBeInTheDocument();
    expect(screen.getByText('Layer 1 (50)')).toBeInTheDocument();
    expect(screen.getByText('DeFi (30)')).toBeInTheDocument();
  });

  it('renders sortable column headers', () => {
    render(
      <TokenTable
        initialTokens={[]}
        initialPagination={{ ...mockPagination, total: 0 }}
        categories={[]}
      />
    );

    expect(screen.getByText('#')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('Market Cap')).toBeInTheDocument();
    expect(screen.getByText('Volume 24h')).toBeInTheDocument();
    expect(screen.getByText('7d')).toBeInTheDocument();
    expect(screen.getByText('30d')).toBeInTheDocument();
  });

  it('shows "No tokens found" when empty', () => {
    render(
      <TokenTable
        initialTokens={[]}
        initialPagination={{ ...mockPagination, total: 0 }}
        categories={[]}
      />
    );

    expect(screen.getByText('No tokens found')).toBeInTheDocument();
  });

  it('renders pagination controls when needed', () => {
    render(
      <TokenTable
        initialTokens={[createMockToken()]}
        initialPagination={{ total: 200, limit: 100, offset: 0, hasMore: true }}
        categories={[]}
      />
    );

    expect(screen.getByText('Prev')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });

  it('does not render pagination when only one page', () => {
    render(
      <TokenTable
        initialTokens={[createMockToken()]}
        initialPagination={mockPagination}
        categories={[]}
      />
    );

    expect(screen.queryByText('Prev')).not.toBeInTheDocument();
    expect(screen.queryByText('Next')).not.toBeInTheDocument();
  });

  it('links token rows to /token/[slug]', () => {
    render(
      <TokenTable
        initialTokens={[createMockToken()]}
        initialPagination={{ ...mockPagination, total: 1 }}
        categories={[]}
      />
    );

    const link = screen.getByText('Bitcoin').closest('a');
    expect(link).toHaveAttribute('href', '/token/bitcoin');
  });

  it('renders token logos', () => {
    render(
      <TokenTable
        initialTokens={[createMockToken()]}
        initialPagination={{ ...mockPagination, total: 1 }}
        categories={[]}
      />
    );

    const img = screen.getByAltText('Bitcoin');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png');
  });

  it('renders null rank changes as dash', () => {
    const token = createMockToken({
      rankChange7d: null,
      rankChange30d: null,
    });

    render(
      <TokenTable
        initialTokens={[token]}
        initialPagination={{ ...mockPagination, total: 1 }}
        categories={[]}
      />
    );

    // Two dashes for 7d and 30d null values
    const dashes = screen.getAllByText('—');
    expect(dashes).toHaveLength(2);
  });
});
