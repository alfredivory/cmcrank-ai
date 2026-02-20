import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CompareDropdown from '@/components/compare/CompareDropdown';
import type { TokenSearchResult } from '@/types/api';

vi.mock('@/components/compare/TokenSearchInput', () => ({
  default: ({ disabled }: { disabled?: boolean }) => (
    <div data-testid="token-search-input" data-disabled={disabled}>
      MockTokenSearchInput
    </div>
  ),
}));

const mockTokens: TokenSearchResult[] = [
  { id: 'token-1', name: 'Bitcoin', symbol: 'BTC', slug: 'bitcoin', logoUrl: null, currentRank: 1 },
  { id: 'token-2', name: 'Ethereum', symbol: 'ETH', slug: 'ethereum', logoUrl: null, currentRank: 2 },
];

describe('CompareDropdown', () => {
  const defaultProps = {
    mainTokenId: 'main-token',
    compareTokens: [] as TokenSearchResult[],
    onAddToken: vi.fn(),
    onRemoveToken: vi.fn(),
  };

  it('renders button with "Compare" text', () => {
    render(<CompareDropdown {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Compare' })).toBeInTheDocument();
  });

  it('shows count badge when tokens are selected', () => {
    render(<CompareDropdown {...defaultProps} compareTokens={mockTokens} />);
    expect(screen.getByRole('button', { name: 'Compare (2)' })).toBeInTheDocument();
  });

  it('opens dropdown on button click', () => {
    render(<CompareDropdown {...defaultProps} />);
    expect(screen.queryByTestId('token-search-input')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Compare' }));

    expect(screen.getByTestId('token-search-input')).toBeInTheDocument();
  });

  it('closes dropdown on Escape key', () => {
    render(<CompareDropdown {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Compare' }));
    expect(screen.getByTestId('token-search-input')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByTestId('token-search-input')).not.toBeInTheDocument();
  });

  it('renders comparison tokens with remove buttons', () => {
    render(<CompareDropdown {...defaultProps} compareTokens={mockTokens} />);
    fireEvent.click(screen.getByRole('button', { name: 'Compare (2)' }));

    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('Ethereum')).toBeInTheDocument();
    expect(screen.getByText('ETH')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Bitcoin')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Ethereum')).toBeInTheDocument();
  });

  it('calls onRemoveToken when remove button is clicked', () => {
    const onRemoveToken = vi.fn();
    render(
      <CompareDropdown
        {...defaultProps}
        compareTokens={mockTokens}
        onRemoveToken={onRemoveToken}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Compare (2)' }));
    fireEvent.click(screen.getByLabelText('Remove Bitcoin'));

    expect(onRemoveToken).toHaveBeenCalledWith('token-1');
  });

  it('shows hint text when no comparison tokens are selected', () => {
    render(<CompareDropdown {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Compare' }));

    expect(screen.getByText('Search to add tokens for comparison')).toBeInTheDocument();
  });

  it('disables search when at max tokens', () => {
    const fourTokens: TokenSearchResult[] = [
      { id: 't1', name: 'Token1', symbol: 'T1', slug: 'token1', logoUrl: null, currentRank: 1 },
      { id: 't2', name: 'Token2', symbol: 'T2', slug: 'token2', logoUrl: null, currentRank: 2 },
      { id: 't3', name: 'Token3', symbol: 'T3', slug: 'token3', logoUrl: null, currentRank: 3 },
      { id: 't4', name: 'Token4', symbol: 'T4', slug: 'token4', logoUrl: null, currentRank: 4 },
    ];
    render(<CompareDropdown {...defaultProps} compareTokens={fourTokens} />);
    fireEvent.click(screen.getByRole('button', { name: 'Compare (4)' }));

    expect(screen.getByTestId('token-search-input')).toHaveAttribute('data-disabled', 'true');
  });

  it('closes dropdown on click outside', () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <CompareDropdown {...defaultProps} />
      </div>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Compare' }));
    expect(screen.getByTestId('token-search-input')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(screen.queryByTestId('token-search-input')).not.toBeInTheDocument();
  });
});
