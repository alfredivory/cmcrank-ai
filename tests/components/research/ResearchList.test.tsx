import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResearchList from '@/components/research/ResearchList';

describe('ResearchList', () => {
  it('shows empty state when no items', () => {
    render(<ResearchList items={[]} />);
    expect(screen.getByText('No research yet for this token')).toBeInTheDocument();
  });

  it('renders research items with title', () => {
    render(
      <ResearchList
        items={[
          {
            id: 'res1',
            title: 'The ETF Rally',
            dateRangeStart: '2024-01-01',
            dateRangeEnd: '2024-01-31',
            status: 'COMPLETE',
            importanceScore: 80,
            createdAt: '2024-02-01T00:00:00Z',
          },
        ]}
      />
    );
    expect(screen.getByText('The ETF Rally')).toBeInTheDocument();
    expect(screen.getByText(/2024-01-01 to 2024-01-31/)).toBeInTheDocument();
    expect(screen.getByText('Significant')).toBeInTheDocument();
  });

  it('falls back to date range when title is null', () => {
    render(
      <ResearchList
        items={[
          {
            id: 'res1',
            title: null,
            dateRangeStart: '2024-01-01',
            dateRangeEnd: '2024-01-31',
            status: 'COMPLETE',
            importanceScore: 80,
            createdAt: '2024-02-01T00:00:00Z',
          },
        ]}
      />
    );
    // Title line shows date range as fallback
    const links = screen.getAllByRole('link');
    expect(links[0].textContent).toContain('2024-01-01 to 2024-01-31');
  });

  it('shows correct importance badge for critical', () => {
    render(
      <ResearchList
        items={[
          {
            id: 'res1',
            title: 'Critical Event',
            dateRangeStart: '2024-01-01',
            dateRangeEnd: '2024-01-31',
            status: 'COMPLETE',
            importanceScore: 95,
            createdAt: '2024-02-01T00:00:00Z',
          },
        ]}
      />
    );
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });
});
