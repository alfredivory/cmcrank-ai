import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateResearchPdf } from '@/lib/pdf/research';

const mockResearch = {
  id: 'res1',
  title: 'The ETF Rally',
  dateRangeStart: '2024-01-01',
  dateRangeEnd: '2024-01-31',
  importanceScore: 85,
  content: {
    executiveSummary: 'Bitcoin gained rank due to ETF approval.',
    findings: [
      { title: 'ETF Impact', content: 'The **spot ETF** approval drove institutional interest.' },
      { title: 'Market Reaction', content: 'Price surged [30%](https://example.com) in two weeks.' },
    ],
    sources: [
      { url: 'https://example.com/etf', title: 'ETF News Article', domain: 'example.com' },
      { url: 'https://reuters.com/crypto', title: 'Reuters Report', domain: 'reuters.com' },
    ],
  },
  renderedMarkdown: null,
  token: {
    name: 'Bitcoin',
    symbol: 'BTC',
    slug: 'bitcoin',
    logoUrl: null,
  },
};

// Mock global fetch to prevent real network requests
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('No network')));
});

describe('generateResearchPdf', () => {
  it('returns a valid PDF buffer', async () => {
    const buffer = await generateResearchPdf(mockResearch);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // PDF magic bytes: %PDF
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('embeds metadata in PDF info dict', async () => {
    const buffer = await generateResearchPdf(mockResearch);
    const text = buffer.toString('latin1');
    // PDF info dict contains uncompressed metadata strings
    expect(text).toContain('The ETF Rally');
    expect(text).toContain('CMCRank.ai');
    expect(text).toContain('Research report for Bitcoin');
  });

  it('handles research with no structured content but renderedMarkdown', async () => {
    const research = {
      ...mockResearch,
      content: null,
      renderedMarkdown: '# Bitcoin Analysis\n\nSome markdown content here.',
    };
    const buffer = await generateResearchPdf(research);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('handles research with no content at all', async () => {
    const research = {
      ...mockResearch,
      content: null,
      renderedMarkdown: null,
    };
    const buffer = await generateResearchPdf(research);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('handles research with no title', async () => {
    const research = {
      ...mockResearch,
      title: null,
    };
    const buffer = await generateResearchPdf(research);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('handles research with empty findings and sources', async () => {
    const research = {
      ...mockResearch,
      content: {
        executiveSummary: 'Short summary.',
        findings: [],
        sources: [],
      },
    };
    const buffer = await generateResearchPdf(research);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('attempts to fetch logo when logoUrl is provided', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const research = {
      ...mockResearch,
      token: { ...mockResearch.token, logoUrl: 'https://example.com/logo.png' },
    };
    const buffer = await generateResearchPdf(research);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/logo.png',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    // Should still produce a valid PDF even when logo fetch fails
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
