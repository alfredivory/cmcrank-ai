import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BackfillStatus from '@/components/admin/BackfillStatus';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createMockJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-1',
    dateRangeStart: '2024-02-18T00:00:00.000Z',
    dateRangeEnd: '2026-02-18T00:00:00.000Z',
    tokenScope: 1000,
    status: 'COMPLETE',
    startedAt: '2026-02-18T10:00:00.000Z',
    completedAt: '2026-02-18T10:33:00.000Z',
    tokensProcessed: 1000,
    lastProcessedCmcId: 5000,
    errors: null,
    createdAt: '2026-02-18T10:00:00.000Z',
    ...overrides,
  };
}

describe('BackfillStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no jobs exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    render(<BackfillStatus adminSecret="test-secret" />);

    expect(await screen.findByText('No backfill jobs yet. Start one above.')).toBeInTheDocument();
  });

  it('should render job list with correct status badges', async () => {
    const jobs = [
      createMockJob({ id: 'job-1', status: 'COMPLETE', tokensProcessed: 1000 }),
      createMockJob({ id: 'job-2', status: 'RUNNING', tokensProcessed: 500 }),
      createMockJob({ id: 'job-3', status: 'FAILED', tokensProcessed: 300 }),
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: jobs }),
    });

    render(<BackfillStatus adminSecret="test-secret" />);

    expect(await screen.findByText('COMPLETE')).toBeInTheDocument();
    expect(screen.getByText('RUNNING')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });

  it('should show progress bar for running jobs', async () => {
    const jobs = [
      createMockJob({ id: 'job-1', status: 'RUNNING', tokensProcessed: 500, tokenScope: 1000 }),
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: jobs }),
    });

    render(<BackfillStatus adminSecret="test-secret" />);

    expect(await screen.findByText('500 / 1000')).toBeInTheDocument();
  });

  it('should show pause button for running jobs', async () => {
    const jobs = [
      createMockJob({ id: 'job-1', status: 'RUNNING', tokensProcessed: 500 }),
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: jobs }),
    });

    render(<BackfillStatus adminSecret="test-secret" />);

    expect(await screen.findByText('Pause')).toBeInTheDocument();
  });

  it('should not show pause button for completed jobs', async () => {
    const jobs = [
      createMockJob({ id: 'job-1', status: 'COMPLETE' }),
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: jobs }),
    });

    render(<BackfillStatus adminSecret="test-secret" />);

    await screen.findByText('COMPLETE');
    expect(screen.queryByText('Pause')).not.toBeInTheDocument();
  });

  it('should render all status types with correct styling', async () => {
    const statuses = ['QUEUED', 'RUNNING', 'COMPLETE', 'FAILED', 'PAUSED'];
    const jobs = statuses.map((status, i) =>
      createMockJob({ id: `job-${i}`, status })
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: jobs }),
    });

    render(<BackfillStatus adminSecret="test-secret" />);

    for (const status of statuses) {
      expect(await screen.findByText(status)).toBeInTheDocument();
    }
  });

  it('should disable start button when a job is running', async () => {
    const jobs = [
      createMockJob({ id: 'job-1', status: 'RUNNING', tokensProcessed: 500 }),
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: jobs }),
    });

    render(<BackfillStatus adminSecret="test-secret" />);

    const button = await screen.findByText('Job Running');
    expect(button).toBeDisabled();
  });

  it('should pass admin secret in API calls', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    render(<BackfillStatus adminSecret="my-secret-123" />);

    await screen.findByText('No backfill jobs yet. Start one above.');

    expect(mockFetch).toHaveBeenCalledWith('/api/admin/backfill', {
      headers: { 'x-admin-secret': 'my-secret-123' },
    });
  });
});
