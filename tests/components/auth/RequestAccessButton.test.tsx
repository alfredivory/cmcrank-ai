import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'u1', email: 'test@test.com' } },
    status: 'authenticated',
  }),
}));

import RequestAccessButton from '@/components/auth/RequestAccessButton';

describe('RequestAccessButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders request access button', () => {
    render(<RequestAccessButton />);
    expect(screen.getByRole('button', { name: 'Request Access' })).toBeInTheDocument();
  });

  it('shows success message after submitting', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'req-1' } }),
    });

    render(<RequestAccessButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Request Access' }));

    await waitFor(() => {
      expect(screen.getByText(/Access request submitted/)).toBeInTheDocument();
    });
  });

  it('shows already pending message on 409', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ error: 'Pending request exists' }),
    });

    render(<RequestAccessButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Request Access' }));

    await waitFor(() => {
      expect(screen.getByText(/pending access request/)).toBeInTheDocument();
    });
  });
});
