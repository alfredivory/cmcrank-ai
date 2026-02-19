import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUseSession = vi.fn();

vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

import CreditStatus from '@/components/auth/CreditStatus';

describe('CreditStatus', () => {
  it('renders nothing when not allowlisted', () => {
    mockUseSession.mockReturnValue({
      data: { user: { isAllowlisted: false, creditsRemaining: 0 } },
    });
    const { container } = render(<CreditStatus />);
    expect(container.textContent).toBe('');
  });

  it('renders credits when allowlisted', () => {
    mockUseSession.mockReturnValue({
      data: { user: { isAllowlisted: true, creditsRemaining: 3 } },
    });
    render(<CreditStatus />);
    expect(screen.getByText('3 credits remaining today')).toBeInTheDocument();
  });

  it('uses singular for 1 credit', () => {
    mockUseSession.mockReturnValue({
      data: { user: { isAllowlisted: true, creditsRemaining: 1 } },
    });
    render(<CreditStatus />);
    expect(screen.getByText('1 credit remaining today')).toBeInTheDocument();
  });
});
