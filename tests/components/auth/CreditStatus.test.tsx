import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUseSession = vi.fn();

vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

import CreditStatus from '@/components/auth/CreditStatus';

describe('CreditStatus', () => {
  it('renders nothing when not allowlisted and not admin', () => {
    mockUseSession.mockReturnValue({
      data: { user: { isAllowlisted: false, role: 'USER', creditsRemaining: 0 } },
    });
    const { container } = render(<CreditStatus />);
    expect(container.textContent).toBe('');
  });

  it('renders credits when allowlisted', () => {
    mockUseSession.mockReturnValue({
      data: { user: { isAllowlisted: true, role: 'USER', creditsRemaining: 3 } },
    });
    render(<CreditStatus />);
    expect(screen.getByText('3 credits remaining today')).toBeInTheDocument();
  });

  it('uses singular for 1 credit', () => {
    mockUseSession.mockReturnValue({
      data: { user: { isAllowlisted: true, role: 'USER', creditsRemaining: 1 } },
    });
    render(<CreditStatus />);
    expect(screen.getByText('1 credit remaining today')).toBeInTheDocument();
  });

  it('shows unlimited for admin users', () => {
    mockUseSession.mockReturnValue({
      data: { user: { isAllowlisted: true, role: 'ADMIN', creditsRemaining: -1 } },
    });
    render(<CreditStatus />);
    expect(screen.getByText('Unlimited credits')).toBeInTheDocument();
  });

  it('shows component for non-allowlisted admin', () => {
    mockUseSession.mockReturnValue({
      data: { user: { isAllowlisted: false, role: 'ADMIN', creditsRemaining: -1 } },
    });
    render(<CreditStatus />);
    expect(screen.getByText('Unlimited credits')).toBeInTheDocument();
  });
});
