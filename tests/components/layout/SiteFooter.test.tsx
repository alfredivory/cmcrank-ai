import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SiteFooter from '@/components/layout/SiteFooter';

describe('SiteFooter', () => {
  it('renders the data timestamp when date is provided', () => {
    render(<SiteFooter latestSnapshotDate={new Date('2026-02-18')} />);

    expect(screen.getByText(/Data as of/)).toBeInTheDocument();
    expect(screen.getByText(/Feb 18, 2026/)).toBeInTheDocument();
  });

  it('does not render the timestamp when date is null', () => {
    render(<SiteFooter latestSnapshotDate={null} />);

    expect(screen.queryByText(/Data as of/)).not.toBeInTheDocument();
  });

  it('renders the disclaimer text', () => {
    render(<SiteFooter latestSnapshotDate={null} />);

    expect(screen.getByText(/daily snapshots and are not real-time/)).toBeInTheDocument();
    expect(screen.getByText(/Not affiliated with CoinMarketCap/)).toBeInTheDocument();
  });

  it('renders the GitHub link', () => {
    render(<SiteFooter latestSnapshotDate={null} />);

    const link = screen.getByText('GitHub');
    expect(link).toHaveAttribute('href', 'https://github.com/alfredivory/cmcrank-ai');
  });
});
