import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { id: 'user1', isAllowlisted: true, role: 'USER', creditsRemaining: 5, dailyCreditLimit: 10 },
    },
    status: 'authenticated',
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock ResearchStatusProvider
const mockStartTracking = vi.fn();
vi.mock('@/components/research/ResearchStatusProvider', () => ({
  useResearchStatus: () => ({
    activeResearch: [],
    startTracking: mockStartTracking,
    dismissResearch: vi.fn(),
  }),
}));

import ResearchTrigger from '@/components/research/ResearchTrigger';

const defaultProps = {
  tokenId: 't1',
  slug: 'bitcoin',
  tokenName: 'Bitcoin',
  onClose: vi.fn(),
  onResearchStarted: vi.fn(),
};

describe('ResearchTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('returns null when no range selected', () => {
    const { container } = render(<ResearchTrigger {...defaultProps} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders modal when range is selected', () => {
    render(
      <ResearchTrigger
        {...defaultProps}
        selectedStart="2024-01-01"
        selectedEnd="2024-01-31"
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Investigate This Period' })).toBeInTheDocument();
    expect(screen.getByText('2024-01-01 to 2024-01-31')).toBeInTheDocument();
  });

  it('shows textarea for user context', () => {
    render(
      <ResearchTrigger
        {...defaultProps}
        selectedStart="2024-01-01"
        selectedEnd="2024-01-31"
      />
    );
    expect(screen.getByPlaceholderText(/context or hints/)).toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', () => {
    render(
      <ResearchTrigger
        {...defaultProps}
        selectedStart="2024-01-01"
        selectedEnd="2024-01-31"
      />
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    render(
      <ResearchTrigger
        {...defaultProps}
        selectedStart="2024-01-01"
        selectedEnd="2024-01-31"
      />
    );

    fireEvent.click(screen.getByRole('dialog'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel button is clicked', () => {
    render(
      <ResearchTrigger
        {...defaultProps}
        selectedStart="2024-01-01"
        selectedEnd="2024-01-31"
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('triggers research on Enter key (without Shift)', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { researchId: 'res1', status: 'PENDING' },
      }),
    });

    render(
      <ResearchTrigger
        {...defaultProps}
        selectedStart="2024-01-01"
        selectedEnd="2024-01-31"
      />
    );

    const textarea = screen.getByPlaceholderText(/context or hints/);
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/research/trigger', expect.any(Object));
    });
  });

  it('does not trigger on Shift+Enter', () => {
    render(
      <ResearchTrigger
        {...defaultProps}
        selectedStart="2024-01-01"
        selectedEnd="2024-01-31"
      />
    );

    const textarea = screen.getByPlaceholderText(/context or hints/);
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shows error message on API failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'No credits' }),
    });

    render(
      <ResearchTrigger
        {...defaultProps}
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
        {...defaultProps}
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

  it('calls onResearchStarted and onClose on successful trigger', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { researchId: 'res1', status: 'PENDING' },
      }),
    });

    render(
      <ResearchTrigger
        {...defaultProps}
        selectedStart="2024-01-01"
        selectedEnd="2024-01-31"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Investigate This Period' }));

    await waitFor(() => {
      expect(defaultProps.onResearchStarted).toHaveBeenCalledWith('res1');
      expect(defaultProps.onClose).toHaveBeenCalled();
      expect(mockStartTracking).toHaveBeenCalledWith('res1', 'Bitcoin', 'bitcoin');
    });
  });
});
