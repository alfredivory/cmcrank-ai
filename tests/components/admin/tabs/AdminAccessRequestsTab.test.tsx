import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'admin-1', role: 'ADMIN' } },
    status: 'authenticated',
  }),
}));

import AdminAccessRequestsTab from '@/components/admin/tabs/AdminAccessRequestsTab';

describe('AdminAccessRequestsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders filter buttons', () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
    render(<AdminAccessRequestsTab />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('displays pending requests', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { id: 'r1', email: 'user@test.com', status: 'PENDING', createdAt: '2026-01-01', user: { name: 'User', image: null } },
        ],
      }),
    });
    render(<AdminAccessRequestsTab />);

    await waitFor(() => {
      expect(screen.getByText('user@test.com')).toBeInTheDocument();
      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Deny')).toBeInTheDocument();
    });
  });

  it('shows empty state', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
    render(<AdminAccessRequestsTab />);

    await waitFor(() => {
      expect(screen.getByText('No access requests found.')).toBeInTheDocument();
    });
  });

  it('filters requests when All is clicked', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
    global.fetch = mockFetch;

    render(<AdminAccessRequestsTab />);
    fireEvent.click(screen.getByText('All'));

    await waitFor(() => {
      const calls = mockFetch.mock.calls;
      const lastCall = calls[calls.length - 1][0] as string;
      expect(lastCall).not.toContain('status=');
    });
  });
});
