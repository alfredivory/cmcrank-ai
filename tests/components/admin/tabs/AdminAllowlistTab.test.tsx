import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'admin-1', role: 'ADMIN' } },
    status: 'authenticated',
  }),
}));

import AdminAllowlistTab from '@/components/admin/tabs/AdminAllowlistTab';

describe('AdminAllowlistTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders add entry form', () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
    render(<AdminAllowlistTab />);
    expect(screen.getByPlaceholderText(/defuse.org/)).toBeInTheDocument();
    expect(screen.getByText('Add Entry')).toBeInTheDocument();
  });

  it('displays entries after loading', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { id: '1', pattern: '*@defuse.org', isRegex: false, createdAt: '2026-01-01', createdBy: null },
        ],
      }),
    });
    render(<AdminAllowlistTab />);

    await waitFor(() => {
      expect(screen.getByText('*@defuse.org')).toBeInTheDocument();
    });
  });

  it('has regex checkbox', () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
    render(<AdminAllowlistTab />);
    expect(screen.getByText('Regex')).toBeInTheDocument();
  });

  it('disables add button when pattern is empty', () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
    render(<AdminAllowlistTab />);
    const addButton = screen.getByText('Add Entry');
    expect(addButton).toBeDisabled();
  });
});
