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
      data: { user: { isAllowlisted: false, role: 'USER', creditsRemaining: 0, dailyCreditLimit: 5 } },
    });
    const { container } = render(<CreditStatus />);
    expect(container.textContent).toBe('');
  });

  it('renders credits in N/M format when allowlisted', () => {
    mockUseSession.mockReturnValue({
      data: { user: { isAllowlisted: true, role: 'USER', creditsRemaining: 3, dailyCreditLimit: 10 } },
    });
    render(<CreditStatus />);
    expect(screen.getByText('3/10 credits available')).toBeInTheDocument();
  });

  it('renders 1/5 format for single credit', () => {
    mockUseSession.mockReturnValue({
      data: { user: { isAllowlisted: true, role: 'USER', creditsRemaining: 1, dailyCreditLimit: 5 } },
    });
    render(<CreditStatus />);
    expect(screen.getByText('1/5 credits available')).toBeInTheDocument();
  });

  it('shows unlimited for admin users', () => {
    mockUseSession.mockReturnValue({
      data: { user: { isAllowlisted: true, role: 'ADMIN', creditsRemaining: -1, dailyCreditLimit: -1 } },
    });
    render(<CreditStatus />);
    expect(screen.getByText('Unlimited credits')).toBeInTheDocument();
  });

  it('shows component for non-allowlisted admin', () => {
    mockUseSession.mockReturnValue({
      data: { user: { isAllowlisted: false, role: 'ADMIN', creditsRemaining: -1, dailyCreditLimit: -1 } },
    });
    render(<CreditStatus />);
    expect(screen.getByText('Unlimited credits')).toBeInTheDocument();
  });

  it('applies red text when 0 credits remaining', () => {
    mockUseSession.mockReturnValue({
      data: { user: { isAllowlisted: true, role: 'USER', creditsRemaining: 0, dailyCreditLimit: 5 } },
    });
    render(<CreditStatus />);
    const el = screen.getByText('0/5 credits available');
    expect(el.className).toContain('text-red-400');
  });

  it('applies gray text when credits remaining', () => {
    mockUseSession.mockReturnValue({
      data: { user: { isAllowlisted: true, role: 'USER', creditsRemaining: 3, dailyCreditLimit: 5 } },
    });
    render(<CreditStatus />);
    const el = screen.getByText('3/5 credits available');
    expect(el.className).toContain('text-gray-400');
  });
});
