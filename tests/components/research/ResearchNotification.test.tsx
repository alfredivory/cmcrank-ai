import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockDismiss = vi.fn();

vi.mock('@/components/research/ResearchStatusProvider', () => ({
  useResearchStatus: () => ({
    activeResearch: [
      { researchId: 'res1', tokenName: 'Bitcoin', tokenSlug: 'bitcoin', status: 'RUNNING' },
      { researchId: 'res2', tokenName: 'Ethereum', tokenSlug: 'ethereum', status: 'COMPLETE' },
    ],
    startTracking: vi.fn(),
    dismissResearch: mockDismiss,
  }),
}));

import ResearchNotification from '@/components/research/ResearchNotification';

describe('ResearchNotification', () => {
  it('shows running research notification', () => {
    render(<ResearchNotification />);
    expect(screen.getByText('Researching Bitcoin...')).toBeInTheDocument();
  });

  it('shows completed research with link', () => {
    render(<ResearchNotification />);
    expect(screen.getByText('Research ready! View report')).toBeInTheDocument();
  });

  it('dismisses notification on click', () => {
    render(<ResearchNotification />);
    const dismissButtons = screen.getAllByLabelText('Dismiss notification');
    fireEvent.click(dismissButtons[0]);
    expect(mockDismiss).toHaveBeenCalledWith('res1');
  });

  it('shows multiple notifications stacked', () => {
    render(<ResearchNotification />);
    expect(screen.getByText('Researching Bitcoin...')).toBeInTheDocument();
    expect(screen.getByText('Research ready! View report')).toBeInTheDocument();
  });
});
