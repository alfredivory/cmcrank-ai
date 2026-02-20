import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CompareLegend from '@/components/compare/CompareLegend';
import type { TokenSearchResult } from '@/types/api';

const mockTokens: TokenSearchResult[] = [
  { id: 'token-1', name: 'Bitcoin', symbol: 'BTC', slug: 'bitcoin', logoUrl: null, currentRank: 1 },
  { id: 'token-2', name: 'Ethereum', symbol: 'ETH', slug: 'ethereum', logoUrl: null, currentRank: 2 },
];

describe('CompareLegend', () => {
  it('renders legend entries for each token', () => {
    render(
      <CompareLegend tokens={mockTokens} hiddenTokenIds={new Set()} onToggleVisibility={vi.fn()} />
    );
    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('Ethereum')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('applies hidden styling to hidden tokens', () => {
    render(
      <CompareLegend
        tokens={mockTokens}
        hiddenTokenIds={new Set(['token-1'])}
        onToggleVisibility={vi.fn()}
      />
    );
    const btcButton = screen.getByText('Bitcoin').closest('button');
    expect(btcButton?.className).toContain('opacity-40');
    expect(btcButton?.className).toContain('line-through');

    const ethButton = screen.getByText('Ethereum').closest('button');
    expect(ethButton?.className).not.toContain('opacity-40');
  });

  it('calls onToggleVisibility with correct token id', () => {
    const onToggle = vi.fn();
    render(
      <CompareLegend tokens={mockTokens} hiddenTokenIds={new Set()} onToggleVisibility={onToggle} />
    );
    fireEvent.click(screen.getByText('Ethereum'));
    expect(onToggle).toHaveBeenCalledWith('token-2');
  });
});
