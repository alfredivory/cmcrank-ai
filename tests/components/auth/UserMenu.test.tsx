import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockSignOut = vi.fn();
const mockUseSession = vi.fn();

vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
  signIn: vi.fn(),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import UserMenu from '@/components/auth/UserMenu';

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton when loading', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'loading' });
    const { container } = render(<UserMenu />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows sign in button when unauthenticated', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
    render(<UserMenu />);
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('shows user avatar when authenticated', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-1',
          name: 'Test',
          email: 'test@test.com',
          image: null,
          role: 'USER',
          isAllowlisted: false,
          creditsRemaining: 5,
        },
      },
      status: 'authenticated',
    });
    render(<UserMenu />);
    expect(screen.getByLabelText('User menu')).toBeInTheDocument();
  });

  it('opens dropdown on click and shows user info', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@test.com',
          image: null,
          role: 'USER',
          isAllowlisted: false,
          creditsRemaining: 5,
        },
      },
      status: 'authenticated',
    });
    render(<UserMenu />);
    fireEvent.click(screen.getByLabelText('User menu'));
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@test.com')).toBeInTheDocument();
    expect(screen.getByText('USER')).toBeInTheDocument();
  });

  it('shows Admin Panel link for admin users', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-1',
          name: 'Admin',
          email: 'admin@test.com',
          image: null,
          role: 'ADMIN',
          isAllowlisted: true,
          creditsRemaining: 5,
        },
      },
      status: 'authenticated',
    });
    render(<UserMenu />);
    fireEvent.click(screen.getByLabelText('User menu'));
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('calls signOut when Sign Out clicked', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-1',
          name: 'Test',
          email: 'test@test.com',
          image: null,
          role: 'USER',
          isAllowlisted: false,
          creditsRemaining: 5,
        },
      },
      status: 'authenticated',
    });
    render(<UserMenu />);
    fireEvent.click(screen.getByLabelText('User menu'));
    fireEvent.click(screen.getByText('Sign Out'));
    expect(mockSignOut).toHaveBeenCalled();
  });
});
