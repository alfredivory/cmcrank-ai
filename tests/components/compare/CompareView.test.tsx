import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CompareView from '@/components/compare/CompareView';
import type { TokenSearchResult, SnapshotDataPoint } from '@/types/api';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
  };
});

const mockTokens: TokenSearchResult[] = [
  { id: 'token-1', name: 'Bitcoin', symbol: 'BTC', slug: 'bitcoin', logoUrl: null, currentRank: 1 },
  { id: 'token-2', name: 'Ethereum', symbol: 'ETH', slug: 'ethereum', logoUrl: null, currentRank: 2 },
];

const mockSnapshots: SnapshotDataPoint[] = [
  { date: '2026-01-19', rank: 1, marketCap: 1e12, price: 50000, volume24h: 30e9, circulatingSupply: 19e6 },
  { date: '2026-02-18', rank: 2, marketCap: 900e9, price: 45000, volume24h: 25e9, circulatingSupply: 19e6 },
];

function createSnapshotMap(): Map<string, SnapshotDataPoint[]> {
  const map = new Map<string, SnapshotDataPoint[]>();
  map.set('token-1', mockSnapshots);
  map.set('token-2', mockSnapshots);
  return map;
}

describe('CompareView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders empty state when no tokens selected', () => {
    render(
      <CompareView
        initialTokens={[]}
        initialSnapshots={new Map()}
        initialRange="30d"
        initialNormalize={false}
      />
    );
    expect(screen.getByText(/Search and add tokens/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search tokens to compare...')).toBeInTheDocument();
  });

  it('renders chart when tokens are provided', () => {
    const { container } = render(
      <CompareView
        initialTokens={mockTokens}
        initialSnapshots={createSnapshotMap()}
        initialRange="30d"
        initialNormalize={false}
      />
    );
    // Token chips shown (text appears in chips + legend)
    expect(screen.getAllByText('Bitcoin').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Ethereum').length).toBeGreaterThanOrEqual(1);
    // Chart rendered
    expect(container.querySelector('.recharts-wrapper')).toBeInTheDocument();
  });

  it('renders time range selector', () => {
    render(
      <CompareView
        initialTokens={mockTokens}
        initialSnapshots={createSnapshotMap()}
        initialRange="30d"
        initialNormalize={false}
      />
    );
    expect(screen.getByText('7D')).toBeInTheDocument();
    expect(screen.getByText('30D')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('renders normalize toggle', () => {
    render(
      <CompareView
        initialTokens={mockTokens}
        initialSnapshots={createSnapshotMap()}
        initialRange="30d"
        initialNormalize={false}
      />
    );
    expect(screen.getByText('Normalize')).toBeInTheDocument();
  });

  it('toggles normalize and updates URL', () => {
    render(
      <CompareView
        initialTokens={mockTokens}
        initialSnapshots={createSnapshotMap()}
        initialRange="30d"
        initialNormalize={false}
      />
    );

    const normalizeBtn = screen.getByText('Normalize');
    expect(normalizeBtn.className).toContain('bg-gray-700');

    fireEvent.click(normalizeBtn);
    expect(normalizeBtn.className).toContain('bg-blue-500');
    expect(window.history.replaceState).toHaveBeenCalled();
  });

  it('removes token and updates URL', () => {
    render(
      <CompareView
        initialTokens={mockTokens}
        initialSnapshots={createSnapshotMap()}
        initialRange="30d"
        initialNormalize={false}
      />
    );

    fireEvent.click(screen.getByLabelText('Remove Bitcoin'));

    expect(screen.queryByLabelText('Remove Bitcoin')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Remove Ethereum')).toBeInTheDocument();
    expect(window.history.replaceState).toHaveBeenCalled();
  });

  it('fetches data when range changes', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          tokens: mockTokens.map((t) => ({ token: t, snapshots: mockSnapshots })),
          range: '7d',
        },
      }),
    });

    render(
      <CompareView
        initialTokens={mockTokens}
        initialSnapshots={createSnapshotMap()}
        initialRange="30d"
        initialNormalize={false}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText('7D'));
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/compare?tokens=bitcoin,ethereum&range=7d')
    );
  });

  it('renders legend with visibility toggle', () => {
    render(
      <CompareView
        initialTokens={mockTokens}
        initialSnapshots={createSnapshotMap()}
        initialRange="30d"
        initialNormalize={false}
      />
    );

    // Legend entries are buttons containing #rank text
    const legendButtons = screen.getAllByText('#1');
    expect(legendButtons.length).toBeGreaterThanOrEqual(1);

    // Find the legend button (it contains token name + symbol + rank)
    const btcLegendBtn = legendButtons[0].closest('button')!;
    expect(btcLegendBtn).toBeInTheDocument();

    // Click to toggle visibility
    fireEvent.click(btcLegendBtn);
    expect(btcLegendBtn.className).toContain('opacity-40');
  });

  it('initializes with normalize enabled', () => {
    render(
      <CompareView
        initialTokens={mockTokens}
        initialSnapshots={createSnapshotMap()}
        initialRange="30d"
        initialNormalize={true}
      />
    );

    const normalizeBtn = screen.getByText('Normalize');
    expect(normalizeBtn.className).toContain('bg-blue-500');
  });
});
