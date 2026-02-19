import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockSignIn = vi.fn();
vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

import SignInButton from '@/components/auth/SignInButton';

describe('SignInButton', () => {
  it('renders sign in button', () => {
    render(<SignInButton />);
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('calls signIn on click', () => {
    render(<SignInButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(mockSignIn).toHaveBeenCalled();
  });
});
