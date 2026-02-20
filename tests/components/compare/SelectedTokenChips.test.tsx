import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SelectedTokenChips from '@/components/compare/SelectedTokenChips';
import type { TokenSearchResult } from '@/types/api';

const mockTokens: TokenSearchResult[] = [
  { id: 'token-1', name: 'Bitcoin', symbol: 'BTC', slug: 'bitcoin', logoUrl: null, currentRank: 1 },
  { id: 'token-2', name: 'Ethereum', symbol: 'ETH', slug: 'ethereum', logoUrl: null, currentRank: 2 },
];

describe('SelectedTokenChips', () => {
  it('renders chips for each token', () => {
    render(<SelectedTokenChips tokens={mockTokens} onRemove={vi.fn()} />);
    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('Ethereum')).toBeInTheDocument();
    expect(screen.getByText('ETH')).toBeInTheDocument();
  });

  it('calls onRemove with correct token id', () => {
    const onRemove = vi.fn();
    render(<SelectedTokenChips tokens={mockTokens} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Remove Bitcoin'));
    expect(onRemove).toHaveBeenCalledWith('token-1');
  });

  it('renders colored dots', () => {
    render(<SelectedTokenChips tokens={mockTokens} onRemove={vi.fn()} />);
    const dots = document.querySelectorAll('.rounded-full.w-2\\.5');
    expect(dots).toHaveLength(2);
  });

  it('renders nothing for empty tokens', () => {
    const { container } = render(<SelectedTokenChips tokens={[]} onRemove={vi.fn()} />);
    expect(container.querySelector('.bg-gray-700')).not.toBeInTheDocument();
  });
});
