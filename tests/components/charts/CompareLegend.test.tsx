import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CompareLegend from '@/components/charts/CompareLegend';
import type { TokenSearchResult } from '@/types/api';
import { COMPARE_COLORS } from '@/lib/chart-utils';

const mainToken: TokenSearchResult = {
  id: 'token-main',
  name: 'Bitcoin',
  symbol: 'BTC',
  slug: 'bitcoin',
  logoUrl: null,
  currentRank: 1,
};

const compareTokens: TokenSearchResult[] = [
  { id: 'token-2', name: 'Ethereum', symbol: 'ETH', slug: 'ethereum', logoUrl: null, currentRank: 2 },
  { id: 'token-3', name: 'Solana', symbol: 'SOL', slug: 'solana', logoUrl: null, currentRank: 5 },
];

describe('CompareLegend', () => {
  it('renders main token with "(primary)" label', () => {
    render(
      <CompareLegend
        mainToken={mainToken}
        compareTokens={compareTokens}
        hiddenTokenIds={new Set()}
        onToggleVisibility={() => {}}
        onRemoveToken={() => {}}
      />
    );

    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('(primary)')).toBeInTheDocument();
  });

  it('renders all comparison tokens with correct names', () => {
    render(
      <CompareLegend
        mainToken={mainToken}
        compareTokens={compareTokens}
        hiddenTokenIds={new Set()}
        onToggleVisibility={() => {}}
        onRemoveToken={() => {}}
      />
    );

    expect(screen.getByText('Ethereum')).toBeInTheDocument();
    expect(screen.getByText('ETH')).toBeInTheDocument();
    expect(screen.getByText('Solana')).toBeInTheDocument();
    expect(screen.getByText('SOL')).toBeInTheDocument();
  });

  it('calls onToggleVisibility when a token is clicked', () => {
    const handleToggle = vi.fn();

    render(
      <CompareLegend
        mainToken={mainToken}
        compareTokens={compareTokens}
        hiddenTokenIds={new Set()}
        onToggleVisibility={handleToggle}
        onRemoveToken={() => {}}
      />
    );

    fireEvent.click(screen.getByText('Ethereum'));

    expect(handleToggle).toHaveBeenCalledTimes(1);
    expect(handleToggle).toHaveBeenCalledWith('token-2');
  });

  it('calls onRemoveToken when x button is clicked on comparison token', () => {
    const handleRemove = vi.fn();

    render(
      <CompareLegend
        mainToken={mainToken}
        compareTokens={compareTokens}
        hiddenTokenIds={new Set()}
        onToggleVisibility={() => {}}
        onRemoveToken={handleRemove}
      />
    );

    fireEvent.click(screen.getByLabelText('Remove Ethereum'));

    expect(handleRemove).toHaveBeenCalledTimes(1);
    expect(handleRemove).toHaveBeenCalledWith('token-2');
  });

  it('does not show remove button on primary token', () => {
    render(
      <CompareLegend
        mainToken={mainToken}
        compareTokens={compareTokens}
        hiddenTokenIds={new Set()}
        onToggleVisibility={() => {}}
        onRemoveToken={() => {}}
      />
    );

    expect(screen.queryByLabelText('Remove Bitcoin')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Remove Ethereum')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Solana')).toBeInTheDocument();
  });

  it('does not trigger onToggleVisibility when x button is clicked', () => {
    const handleToggle = vi.fn();
    const handleRemove = vi.fn();

    render(
      <CompareLegend
        mainToken={mainToken}
        compareTokens={compareTokens}
        hiddenTokenIds={new Set()}
        onToggleVisibility={handleToggle}
        onRemoveToken={handleRemove}
      />
    );

    fireEvent.click(screen.getByLabelText('Remove Solana'));

    expect(handleRemove).toHaveBeenCalledTimes(1);
    expect(handleToggle).not.toHaveBeenCalled();
  });

  it('hidden tokens have reduced opacity', () => {
    render(
      <CompareLegend
        mainToken={mainToken}
        compareTokens={compareTokens}
        hiddenTokenIds={new Set(['token-2'])}
        onToggleVisibility={() => {}}
        onRemoveToken={() => {}}
      />
    );

    // The button containing Ethereum should have opacity-40
    const ethButton = screen.getByText('Ethereum').closest('button');
    expect(ethButton).toHaveClass('opacity-40');

    // The main token button should NOT have opacity-40
    const btcButton = screen.getByText('Bitcoin').closest('button');
    expect(btcButton).not.toHaveClass('opacity-40');
  });

  it('hidden tokens have strikethrough text', () => {
    render(
      <CompareLegend
        mainToken={mainToken}
        compareTokens={compareTokens}
        hiddenTokenIds={new Set(['token-3'])}
        onToggleVisibility={() => {}}
        onRemoveToken={() => {}}
      />
    );

    const solName = screen.getByText('Solana');
    expect(solName).toHaveClass('line-through');

    const solSymbol = screen.getByText('SOL');
    expect(solSymbol).toHaveClass('line-through');

    // Non-hidden token should not have line-through
    const btcName = screen.getByText('Bitcoin');
    expect(btcName).not.toHaveClass('line-through');
  });

  it('renders correct number of color dots', () => {
    render(
      <CompareLegend
        mainToken={mainToken}
        compareTokens={compareTokens}
        hiddenTokenIds={new Set()}
        onToggleVisibility={() => {}}
        onRemoveToken={() => {}}
      />
    );

    const mainDot = screen.getByTestId('color-dot-token-main');
    const ethDot = screen.getByTestId('color-dot-token-2');
    const solDot = screen.getByTestId('color-dot-token-3');

    expect(mainDot).toBeInTheDocument();
    expect(ethDot).toBeInTheDocument();
    expect(solDot).toBeInTheDocument();

    // Verify colors match COMPARE_COLORS order
    expect(mainDot).toHaveStyle({ backgroundColor: COMPARE_COLORS[0] });
    expect(ethDot).toHaveStyle({ backgroundColor: COMPARE_COLORS[1] });
    expect(solDot).toHaveStyle({ backgroundColor: COMPARE_COLORS[2] });
  });

  it('does not show "(primary)" label on comparison tokens', () => {
    render(
      <CompareLegend
        mainToken={mainToken}
        compareTokens={compareTokens}
        hiddenTokenIds={new Set()}
        onToggleVisibility={() => {}}
        onRemoveToken={() => {}}
      />
    );

    // Only one "(primary)" label should exist
    const primaryLabels = screen.getAllByText('(primary)');
    expect(primaryLabels).toHaveLength(1);
  });
});
