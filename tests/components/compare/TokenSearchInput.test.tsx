import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import TokenSearchInput from '@/components/compare/TokenSearchInput';
import type { TokenListItem } from '@/types/api';

const mockResults: TokenListItem[] = [
  {
    id: 'token-1', cmcId: 1, name: 'Bitcoin', symbol: 'BTC', slug: 'bitcoin',
    logoUrl: null, currentRank: 1, price: 50000, marketCap: 1e12, volume24h: 30e9,
    rankChange7d: 0, rankChange30d: 2, categories: [],
  },
  {
    id: 'token-2', cmcId: 1027, name: 'Ethereum', symbol: 'ETH', slug: 'ethereum',
    logoUrl: null, currentRank: 2, price: 3000, marketCap: 360e9, volume24h: 15e9,
    rankChange7d: 1, rankChange30d: 0, categories: [],
  },
];

function setupFetch(results: TokenListItem[] = mockResults) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: async () => ({ data: { tokens: results } }),
  });
}

async function typeAndWait(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
  // Advance past debounce
  await act(async () => {
    vi.advanceTimersByTime(300);
  });
  // Let promises resolve
  await act(async () => {
    await vi.runAllTimersAsync();
  });
}

describe('TokenSearchInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders search input', () => {
    render(<TokenSearchInput excludeIds={new Set()} onSelect={vi.fn()} />);
    expect(screen.getByPlaceholderText('Search tokens to compare...')).toBeInTheDocument();
  });

  it('fetches results after debounce', async () => {
    setupFetch();
    render(<TokenSearchInput excludeIds={new Set()} onSelect={vi.fn()} />);
    const input = screen.getByPlaceholderText('Search tokens to compare...');

    fireEvent.change(input, { target: { value: 'bit' } });

    // Before debounce — not called yet
    expect(global.fetch).not.toHaveBeenCalled();

    // Advance past debounce and let promises resolve
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/tokens?search=bit&limit=10');
  });

  it('shows dropdown with results', async () => {
    setupFetch();
    render(<TokenSearchInput excludeIds={new Set()} onSelect={vi.fn()} />);
    const input = screen.getByPlaceholderText('Search tokens to compare...');

    await typeAndWait(input, 'bit');

    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.getByText('Ethereum')).toBeInTheDocument();
  });

  it('filters out excluded tokens', async () => {
    setupFetch();
    render(<TokenSearchInput excludeIds={new Set(['token-1'])} onSelect={vi.fn()} />);
    const input = screen.getByPlaceholderText('Search tokens to compare...');

    await typeAndWait(input, 'e');

    expect(screen.getByText('Ethereum')).toBeInTheDocument();
    expect(screen.queryByText('Bitcoin')).not.toBeInTheDocument();
  });

  it('calls onSelect and clears input when result is clicked', async () => {
    setupFetch();
    const onSelect = vi.fn();
    render(<TokenSearchInput excludeIds={new Set()} onSelect={onSelect} />);
    const input = screen.getByPlaceholderText('Search tokens to compare...') as HTMLInputElement;

    await typeAndWait(input, 'bit');

    expect(screen.getByText('Bitcoin')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('Bitcoin'));
    });

    expect(onSelect).toHaveBeenCalledWith(mockResults[0]);
    expect(input.value).toBe('');
  });

  it('supports keyboard navigation', async () => {
    setupFetch();
    const onSelect = vi.fn();
    render(<TokenSearchInput excludeIds={new Set()} onSelect={onSelect} />);
    const input = screen.getByPlaceholderText('Search tokens to compare...');

    await typeAndWait(input, 'bit');

    expect(screen.getByText('Bitcoin')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    expect(onSelect).toHaveBeenCalledWith(mockResults[0]);
  });

  it('closes dropdown on Escape', async () => {
    setupFetch();
    render(<TokenSearchInput excludeIds={new Set()} onSelect={vi.fn()} />);
    const input = screen.getByPlaceholderText('Search tokens to compare...');

    await typeAndWait(input, 'bit');

    expect(screen.getByText('Bitcoin')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByText('Bitcoin')).not.toBeInTheDocument();
  });

  it('disables input when disabled prop is true', () => {
    render(<TokenSearchInput excludeIds={new Set()} onSelect={vi.fn()} disabled />);
    expect(screen.getByPlaceholderText('Search tokens to compare...')).toBeDisabled();
  });
});
