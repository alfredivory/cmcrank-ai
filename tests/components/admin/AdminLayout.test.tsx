import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signIn: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import AdminLayout from '@/components/admin/AdminLayout';

describe('AdminLayout', () => {
  it('renders tab buttons', () => {
    render(<AdminLayout initialTab="data" />);
    expect(screen.getByText('Data')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Allowlist')).toBeInTheDocument();
    expect(screen.getByText('Access Requests')).toBeInTheDocument();
  });

  it('switches tabs on click', () => {
    render(<AdminLayout initialTab="data" />);
    fireEvent.click(screen.getByText('Users'));
    expect(mockPush).toHaveBeenCalledWith('/admin?tab=users');
  });

  it('defaults to data tab', () => {
    render(<AdminLayout initialTab="data" />);
    const dataButton = screen.getByText('Data');
    expect(dataButton.className).toContain('border-blue-500');
  });
});
