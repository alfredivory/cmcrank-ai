import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signIn: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import SiteHeader from '@/components/layout/SiteHeader';

describe('SiteHeader', () => {
  it('renders logo, tagline, and compare link', () => {
    render(<SiteHeader />);
    expect(screen.getByText('.ai')).toBeInTheDocument();
    expect(screen.getByText(/Relative performance analysis/)).toBeInTheDocument();
    expect(screen.getByText('Compare')).toBeInTheDocument();
  });

  it('renders right content when provided', () => {
    render(<SiteHeader rightContent={<span>Extra Info</span>} />);
    expect(screen.getByText('Extra Info')).toBeInTheDocument();
  });

  it('renders user menu (sign in button for unauthenticated)', () => {
    render(<SiteHeader />);
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });
});
