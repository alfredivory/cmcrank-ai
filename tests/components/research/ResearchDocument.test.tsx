import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResearchDocument from '@/components/research/ResearchDocument';
import type { ResearchDetail } from '@/types/api';

const sampleResearch: ResearchDetail = {
  id: 'res1',
  title: 'The ETF Rally',
  tokenId: 'token1',
  dateRangeStart: '2024-01-01',
  dateRangeEnd: '2024-01-31',
  status: 'COMPLETE',
  content: {
    executiveSummary: 'Bitcoin gained rank due to ETF approval.',
    findings: [
      { title: 'ETF Impact', content: 'The **spot ETF** approval drove institutional interest.' },
    ],
    sources: [
      { url: 'https://example.com', title: 'ETF News', domain: 'example.com' },
    ],
  },
  renderedMarkdown: null,
  importanceScore: 85,
  userContext: null,
  parentResearchId: null,
  createdAt: '2024-02-01T00:00:00Z',
  updatedAt: '2024-02-01T00:00:00Z',
  token: { id: 'token1', name: 'Bitcoin', symbol: 'BTC', slug: 'bitcoin', logoUrl: null, cmcId: 1 },
  events: [],
};

describe('ResearchDocument', () => {
  it('renders token name and date range', () => {
    render(<ResearchDocument research={sampleResearch} />);
    expect(screen.getByText('Bitcoin (BTC)')).toBeInTheDocument();
    expect(screen.getByText('Research: 2024-01-01 to 2024-01-31')).toBeInTheDocument();
  });

  it('renders executive summary', () => {
    render(<ResearchDocument research={sampleResearch} />);
    expect(screen.getByText('Executive Summary')).toBeInTheDocument();
    expect(screen.getByText('Bitcoin gained rank due to ETF approval.')).toBeInTheDocument();
  });

  it('renders findings', () => {
    render(<ResearchDocument research={sampleResearch} />);
    expect(screen.getByText('ETF Impact')).toBeInTheDocument();
  });

  it('renders sources with domain badges', () => {
    render(<ResearchDocument research={sampleResearch} />);
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('ETF News')).toBeInTheDocument();
  });
});
