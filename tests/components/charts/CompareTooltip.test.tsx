import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CompareTooltip from '@/components/charts/CompareTooltip';
import type { TokenSearchResult, CompareDataPoint } from '@/types/api';

const mockTokens: TokenSearchResult[] = [
  { id: 'token-1', name: 'Bitcoin', symbol: 'BTC', slug: 'bitcoin', logoUrl: null, currentRank: 1 },
  { id: 'token-2', name: 'Ethereum', symbol: 'ETH', slug: 'ethereum', logoUrl: null, currentRank: 2 },
];

describe('CompareTooltip', () => {
  it('renders null when data is null', () => {
    const { container } = render(
      <CompareTooltip data={null} tokens={mockTokens} normalize={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders date and rank values in normal mode', () => {
    const data: CompareDataPoint = {
      date: '2026-01-15',
      rank_token_1: 1,
      rank_token_2: 5,
    };
    // Token ids use hyphens but CompareDataPoint uses rank_<id> format
    const tokens: TokenSearchResult[] = [
      { id: 'token_1', name: 'Bitcoin', symbol: 'BTC', slug: 'bitcoin', logoUrl: null, currentRank: 1 },
      { id: 'token_2', name: 'Ethereum', symbol: 'ETH', slug: 'ethereum', logoUrl: null, currentRank: 2 },
    ];

    render(<CompareTooltip data={data} tokens={tokens} normalize={false} />);

    expect(screen.getByText('2026-01-15')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#5')).toBeInTheDocument();
    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('ETH')).toBeInTheDocument();
  });

  it('renders normalized delta values', () => {
    const tokens: TokenSearchResult[] = [
      { id: 'tok1', name: 'Bitcoin', symbol: 'BTC', slug: 'bitcoin', logoUrl: null, currentRank: 1 },
    ];
    const data: CompareDataPoint = { date: '2026-01-15', rank_tok1: -3 };

    render(<CompareTooltip data={data} tokens={tokens} normalize={true} />);

    expect(screen.getByText('-3')).toBeInTheDocument();
  });

  it('renders positive delta with plus sign', () => {
    const tokens: TokenSearchResult[] = [
      { id: 'tok1', name: 'Bitcoin', symbol: 'BTC', slug: 'bitcoin', logoUrl: null, currentRank: 1 },
    ];
    const data: CompareDataPoint = { date: '2026-01-15', rank_tok1: 5 };

    render(<CompareTooltip data={data} tokens={tokens} normalize={true} />);

    expect(screen.getByText('+5')).toBeInTheDocument();
  });

  it('skips tokens with null values', () => {
    const tokens: TokenSearchResult[] = [
      { id: 'tok1', name: 'Bitcoin', symbol: 'BTC', slug: 'bitcoin', logoUrl: null, currentRank: 1 },
      { id: 'tok2', name: 'Ethereum', symbol: 'ETH', slug: 'ethereum', logoUrl: null, currentRank: 2 },
    ];
    const data: CompareDataPoint = { date: '2026-01-15', rank_tok1: 10, rank_tok2: null };

    render(<CompareTooltip data={data} tokens={tokens} normalize={false} />);

    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.queryByText('ETH')).not.toBeInTheDocument();
  });
});
