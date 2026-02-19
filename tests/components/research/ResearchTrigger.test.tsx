import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { id: 'user1', isAllowlisted: true, role: 'USER', creditsRemaining: 5 },
    },
    status: 'authenticated',
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock ResearchStatusProvider
vi.mock('@/components/research/ResearchStatusProvider', () => ({
  useResearchStatus: () => ({
    activeResearch: [],
    startTracking: vi.fn(),
    dismissResearch: vi.fn(),
  }),
}));

import ResearchTrigger from '@/components/research/ResearchTrigger';

describe('ResearchTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('shows hint text when no range selected', () => {
    render(<ResearchTrigger tokenId="t1" slug="bitcoin" tokenName="Bitcoin" />);
    expect(screen.getByText(/Drag on the chart/)).toBeInTheDocument();
  });

  it('shows trigger UI when range is selected', () => {
    render(
      <ResearchTrigger
        tokenId="t1"
        slug="bitcoin"
        tokenName="Bitcoin"
        selectedStart="2024-01-01"
        selectedEnd="2024-01-31"
      />
    );
    expect(screen.getByRole('button', { name: 'Investigate This Period' })).toBeInTheDocument();
    expect(screen.getByText('2024-01-01 to 2024-01-31')).toBeInTheDocument();
  });

  it('shows textarea for user context', () => {
    render(
      <ResearchTrigger
        tokenId="t1"
        slug="bitcoin"
        tokenName="Bitcoin"
        selectedStart="2024-01-01"
        selectedEnd="2024-01-31"
      />
    );
    expect(screen.getByPlaceholderText(/context, links/)).toBeInTheDocument();
  });

  it('shows error message on API failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'No credits' }),
    });

    render(
      <ResearchTrigger
        tokenId="t1"
        slug="bitcoin"
        tokenName="Bitcoin"
        selectedStart="2024-01-01"
        selectedEnd="2024-01-31"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Investigate This Period' }));

    await waitFor(() => {
      expect(screen.getByText('No credits')).toBeInTheDocument();
    });
  });

  it('shows existing research link on dedup', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { researchId: 'existing1', status: 'EXISTING', existingResearchId: 'existing1' },
      }),
    });

    render(
      <ResearchTrigger
        tokenId="t1"
        slug="bitcoin"
        tokenName="Bitcoin"
        selectedStart="2024-01-01"
        selectedEnd="2024-01-31"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Investigate This Period' }));

    await waitFor(() => {
      expect(screen.getByText(/Research already exists/)).toBeInTheDocument();
      expect(screen.getByText('Research Again')).toBeInTheDocument();
    });
  });

  it('shows progress after successful trigger', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { researchId: 'res1', status: 'PENDING' },
      }),
    });

    render(
      <ResearchTrigger
        tokenId="t1"
        slug="bitcoin"
        tokenName="Bitcoin"
        selectedStart="2024-01-01"
        selectedEnd="2024-01-31"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Investigate This Period' }));

    await waitFor(() => {
      // ResearchProgress should be rendered — it fetches status
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
