import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ResearchProgress from '@/components/research/ResearchProgress';

describe('ResearchProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('shows pending state initially', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { status: 'PENDING' } }),
    });

    render(<ResearchProgress researchId="res1" />);

    await waitFor(() => {
      expect(screen.getByText('Starting research...')).toBeInTheDocument();
    });
  });

  it('shows running state', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { status: 'RUNNING' } }),
    });

    render(<ResearchProgress researchId="res1" />);

    await waitFor(() => {
      expect(screen.getByText('AI is researching...')).toBeInTheDocument();
    });
  });

  it('shows complete state with link', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { status: 'COMPLETE' } }),
    });

    render(<ResearchProgress researchId="res1" />);

    await waitFor(() => {
      expect(screen.getByText('Research ready!')).toBeInTheDocument();
      expect(screen.getByText('View Report')).toBeInTheDocument();
    });
  });

  it('shows failed state', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { status: 'FAILED' } }),
    });

    render(<ResearchProgress researchId="res1" />);

    await waitFor(() => {
      expect(screen.getByText(/Research failed/)).toBeInTheDocument();
    });
  });
});
