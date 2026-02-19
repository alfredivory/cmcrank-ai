import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RankChart from '@/components/charts/RankChart';
import type { SnapshotDataPoint } from '@/types/api';
import type { ResearchPeriod } from '@/components/charts/ResearchBandTooltip';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock recharts — ResponsiveContainer needs explicit dimensions in jsdom
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
  };
});

const mockSnapshots: SnapshotDataPoint[] = [
  { date: '2026-01-19', rank: 2, marketCap: 900e9, price: 45000, volume24h: 25e9, circulatingSupply: 19000000 },
  { date: '2026-02-18', rank: 1, marketCap: 1e12, price: 50000, volume24h: 30e9, circulatingSupply: 19000000 },
];

describe('RankChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
  });

  it('renders time range and overlay selectors', () => {
    render(
      <RankChart
        tokenId="token-1"
        slug="bitcoin"
        initialSnapshots={mockSnapshots}
        initialRange="30d"
      />
    );

    // Time range buttons
    expect(screen.getByText('7D')).toBeInTheDocument();
    expect(screen.getByText('30D')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();

    // Overlay buttons
    expect(screen.getByText('Rank')).toBeInTheDocument();
    expect(screen.getByText('Market Cap')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
  });

  it('shows empty state when no snapshots', () => {
    render(
      <RankChart
        tokenId="token-1"
        slug="bitcoin"
        initialSnapshots={[]}
        initialRange="30d"
      />
    );

    expect(screen.getByText('No data available for this range')).toBeInTheDocument();
  });

  it('fetches new data when range changes', async () => {
    const newSnapshots: SnapshotDataPoint[] = [
      { date: '2026-02-11', rank: 1, marketCap: 950e9, price: 48000, volume24h: 28e9, circulatingSupply: 19000000 },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { snapshots: newSnapshots },
      }),
    });

    render(
      <RankChart
        tokenId="token-1"
        slug="bitcoin"
        initialSnapshots={mockSnapshots}
        initialRange="30d"
      />
    );

    fireEvent.click(screen.getByText('7D'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/tokens/bitcoin/snapshots?range=7d');
    });
  });

  it('applies opacity during loading', async () => {
    // Make fetch hang to keep loading state
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(
      <RankChart
        tokenId="token-1"
        slug="bitcoin"
        initialSnapshots={mockSnapshots}
        initialRange="30d"
      />
    );

    fireEvent.click(screen.getByText('7D'));

    await waitFor(() => {
      const chartContainer = screen.getByText('7D').closest('.bg-gray-800\\/50')
        ?.querySelector('.transition-opacity');
      expect(chartContainer?.className).toContain('opacity-50');
    });
  });

  it('switches overlay when clicking overlay buttons', () => {
    render(
      <RankChart
        tokenId="token-1"
        slug="bitcoin"
        initialSnapshots={mockSnapshots}
        initialRange="30d"
      />
    );

    // Initially Rank is active (blue)
    expect(screen.getByText('Rank').className).toContain('bg-blue-500');

    // Click Price
    fireEvent.click(screen.getByText('Price'));

    expect(screen.getByText('Price').className).toContain('bg-blue-500');
    expect(screen.getByText('Rank').className).not.toContain('bg-blue-500');
  });

  it('updates URL when range changes', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { snapshots: mockSnapshots } }),
    });

    render(
      <RankChart
        tokenId="token-1"
        slug="bitcoin"
        initialSnapshots={mockSnapshots}
        initialRange="30d"
      />
    );

    fireEvent.click(screen.getByText('7D'));

    await waitFor(() => {
      expect(window.history.replaceState).toHaveBeenCalled();
      const lastCall = vi.mocked(window.history.replaceState).mock.lastCall;
      const url = new URL(lastCall![2] as string);
      expect(url.searchParams.get('range')).toBe('7d');
    });
  });

  it('updates URL when overlay changes', () => {
    render(
      <RankChart
        tokenId="token-1"
        slug="bitcoin"
        initialSnapshots={mockSnapshots}
        initialRange="30d"
      />
    );

    fireEvent.click(screen.getByText('Price'));

    expect(window.history.replaceState).toHaveBeenCalled();
    const lastCall = vi.mocked(window.history.replaceState).mock.lastCall;
    const url = new URL(lastCall![2] as string);
    expect(url.searchParams.get('overlay')).toBe('price');
  });

  it('removes custom date params when switching to preset range', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { snapshots: mockSnapshots } }),
    });

    // Start with a location that has custom params
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost/token/bitcoin?range=custom&start=2025-01-01&end=2025-06-30&overlay=rank'),
      writable: true,
    });

    render(
      <RankChart
        tokenId="token-1"
        slug="bitcoin"
        initialSnapshots={mockSnapshots}
        initialRange="custom"
      />
    );

    fireEvent.click(screen.getByText('30D'));

    await waitFor(() => {
      const lastCall = vi.mocked(window.history.replaceState).mock.lastCall;
      const url = new URL(lastCall![2] as string);
      expect(url.searchParams.get('range')).toBe('30d');
      expect(url.searchParams.has('start')).toBe(false);
      expect(url.searchParams.has('end')).toBe(false);
    });
  });

  it('uses initialOverlay when provided', () => {
    render(
      <RankChart
        tokenId="token-1"
        slug="bitcoin"
        initialSnapshots={mockSnapshots}
        initialRange="30d"
        initialOverlay="price"
      />
    );

    expect(screen.getByText('Price').className).toContain('bg-blue-500');
    expect(screen.getByText('Rank').className).not.toContain('bg-blue-500');
  });

  it('renders without crashing when researchPeriods is provided', () => {
    const periods: ResearchPeriod[] = [
      {
        id: 'res-1',
        title: 'The ETF Rally',
        dateRangeStart: '2026-01-19',
        dateRangeEnd: '2026-02-18',
        importanceScore: 85,
      },
    ];

    render(
      <RankChart
        tokenId="token-1"
        slug="bitcoin"
        initialSnapshots={mockSnapshots}
        initialRange="30d"
        researchPeriods={periods}
      />
    );

    // Chart should still render normally
    expect(screen.getByText('7D')).toBeInTheDocument();
    expect(screen.queryByText('No data available for this range')).not.toBeInTheDocument();
  });

  it('renders without research bands when no researchPeriods', () => {
    render(
      <RankChart
        tokenId="token-1"
        slug="bitcoin"
        initialSnapshots={mockSnapshots}
        initialRange="30d"
      />
    );

    // Chart renders fine without research periods
    expect(screen.getByText('Rank')).toBeInTheDocument();
  });

  it('renders without research bands when snapshots are empty', () => {
    const periods: ResearchPeriod[] = [
      {
        id: 'res-1',
        title: 'The ETF Rally',
        dateRangeStart: '2026-01-19',
        dateRangeEnd: '2026-02-18',
        importanceScore: 85,
      },
    ];

    render(
      <RankChart
        tokenId="token-1"
        slug="bitcoin"
        initialSnapshots={[]}
        initialRange="30d"
        researchPeriods={periods}
      />
    );

    expect(screen.getByText('No data available for this range')).toBeInTheDocument();
  });
});
