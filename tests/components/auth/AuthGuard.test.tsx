import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUseSession = vi.fn();

vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
  signIn: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import AuthGuard from '@/components/auth/AuthGuard';

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows sign-in prompt when not authenticated', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
    render(<AuthGuard action="trigger research"><div>Protected</div></AuthGuard>);
    expect(screen.getByText('Sign in to trigger research')).toBeInTheDocument();
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });

  it('shows request access when authenticated but not allowlisted', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'u1', role: 'USER', isAllowlisted: false, creditsRemaining: 0 },
      },
      status: 'authenticated',
    });
    render(<AuthGuard action="trigger research"><div>Protected</div></AuthGuard>);
    expect(screen.getByText("You don't have research access")).toBeInTheDocument();
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });

  it('renders children when allowlisted', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'u1', role: 'USER', isAllowlisted: true, creditsRemaining: 5 },
      },
      status: 'authenticated',
    });
    render(<AuthGuard action="trigger research"><div>Protected</div></AuthGuard>);
    expect(screen.getByText('Protected')).toBeInTheDocument();
  });

  it('renders children when requireAllowlist is false and authenticated', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'u1', role: 'USER', isAllowlisted: false, creditsRemaining: 0 },
      },
      status: 'authenticated',
    });
    render(<AuthGuard action="view" requireAllowlist={false}><div>Content</div></AuthGuard>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
