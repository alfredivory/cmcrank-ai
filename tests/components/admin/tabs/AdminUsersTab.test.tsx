import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'admin-1', role: 'ADMIN' } },
    status: 'authenticated',
  }),
}));

import AdminUsersTab from '@/components/admin/tabs/AdminUsersTab';

describe('AdminUsersTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input', () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
    render(<AdminUsersTab />);
    expect(screen.getByPlaceholderText('Search by email...')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
    render(<AdminUsersTab />);
    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('displays users after loading', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { id: 'u1', name: 'Test User', email: 'test@test.com', image: null, role: 'USER', isAllowlisted: false, createdAt: '2026-01-01' },
        ],
      }),
    });
    render(<AdminUsersTab />);

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  it('shows empty state when no users', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
    render(<AdminUsersTab />);

    await waitFor(() => {
      expect(screen.getByText('No users found.')).toBeInTheDocument();
    });
  });
});
