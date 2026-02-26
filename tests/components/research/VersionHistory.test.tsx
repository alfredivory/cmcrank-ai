import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import VersionHistory from '@/components/research/VersionHistory';

describe('VersionHistory', () => {
  it('renders nothing for v1 with no parent', () => {
    const { container } = render(
      <VersionHistory currentVersion={1} parentResearchId={null} researchId="res1" />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows current version when version > 1', () => {
    render(
      <VersionHistory currentVersion={2} parentResearchId="res1" researchId="res2" />
    );
    expect(screen.getByText('v2 (current)')).toBeInTheDocument();
  });

  it('links to parent research', () => {
    render(
      <VersionHistory currentVersion={2} parentResearchId="res1" researchId="res2" />
    );
    const link = screen.getByText('v1');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/research/res1');
  });

  it('shows arrow between versions', () => {
    const { container } = render(
      <VersionHistory currentVersion={3} parentResearchId="res2" researchId="res3" />
    );
    expect(container.textContent).toContain('→');
  });
});
