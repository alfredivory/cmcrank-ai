import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetResearchById } = vi.hoisted(() => ({
  mockGetResearchById: vi.fn(),
}));

const { mockGenerateResearchPdf } = vi.hoisted(() => ({
  mockGenerateResearchPdf: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createRequestLogger: () => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  }),
}));

vi.mock('@/lib/queries/research', () => ({
  getResearchById: (...args: unknown[]) => mockGetResearchById(...args),
}));

vi.mock('@/lib/pdf/research', () => ({
  generateResearchPdf: (...args: unknown[]) => mockGenerateResearchPdf(...args),
}));

import { GET } from '@/app/api/research/[id]/download/route';

const sampleResearch = {
  id: 'res1',
  title: 'The ETF Rally',
  tokenId: 'token1',
  dateRangeStart: new Date('2024-01-01'),
  dateRangeEnd: new Date('2024-01-31'),
  status: 'COMPLETE',
  content: { executiveSummary: 'Test' },
  renderedMarkdown: '# Test',
  importanceScore: 80,
  userContext: null,
  parentResearchId: null,
  createdAt: new Date('2024-02-01'),
  updatedAt: new Date('2024-02-01'),
  token: { id: 'token1', name: 'Bitcoin', symbol: 'BTC', slug: 'bitcoin', logoUrl: null, cmcId: 1 },
  events: [],
};

describe('GET /api/research/[id]/download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns PDF with correct headers on success', async () => {
    mockGetResearchById.mockResolvedValue(sampleResearch);
    const pdfBuffer = Buffer.from('%PDF-1.4 mock content');
    mockGenerateResearchPdf.mockResolvedValue(pdfBuffer);

    const res = await GET(
      new Request('http://localhost:3000/api/research/res1/download'),
      { params: Promise.resolve({ id: 'res1' }) }
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toBe(
      'attachment; filename="bitcoin-research-2024-01-01-to-2024-01-31.pdf"'
    );
    expect(res.headers.get('Content-Length')).toBe(String(pdfBuffer.length));

    const body = await res.arrayBuffer();
    expect(Buffer.from(body)).toEqual(pdfBuffer);
  });

  it('returns 404 when research not found', async () => {
    mockGetResearchById.mockResolvedValue(null);

    const res = await GET(
      new Request('http://localhost:3000/api/research/nonexistent/download'),
      { params: Promise.resolve({ id: 'nonexistent' }) }
    );

    expect(res.status).toBe(404);
  });

  it('returns 404 when research status is PENDING', async () => {
    mockGetResearchById.mockResolvedValue({ ...sampleResearch, status: 'PENDING' });

    const res = await GET(
      new Request('http://localhost:3000/api/research/res1/download'),
      { params: Promise.resolve({ id: 'res1' }) }
    );

    expect(res.status).toBe(404);
  });

  it('returns 404 when research status is RUNNING', async () => {
    mockGetResearchById.mockResolvedValue({ ...sampleResearch, status: 'RUNNING' });

    const res = await GET(
      new Request('http://localhost:3000/api/research/res1/download'),
      { params: Promise.resolve({ id: 'res1' }) }
    );

    expect(res.status).toBe(404);
  });

  it('returns 404 when research status is FAILED', async () => {
    mockGetResearchById.mockResolvedValue({ ...sampleResearch, status: 'FAILED' });

    const res = await GET(
      new Request('http://localhost:3000/api/research/res1/download'),
      { params: Promise.resolve({ id: 'res1' }) }
    );

    expect(res.status).toBe(404);
  });

  it('returns 500 when PDF generation fails', async () => {
    mockGetResearchById.mockResolvedValue(sampleResearch);
    mockGenerateResearchPdf.mockRejectedValue(new Error('PDF generation error'));

    const res = await GET(
      new Request('http://localhost:3000/api/research/res1/download'),
      { params: Promise.resolve({ id: 'res1' }) }
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to generate PDF');
  });

  it('passes correct input to PDF generator', async () => {
    mockGetResearchById.mockResolvedValue(sampleResearch);
    mockGenerateResearchPdf.mockResolvedValue(Buffer.from('%PDF-1.4'));

    await GET(
      new Request('http://localhost:3000/api/research/res1/download'),
      { params: Promise.resolve({ id: 'res1' }) }
    );

    expect(mockGenerateResearchPdf).toHaveBeenCalledWith({
      id: 'res1',
      title: 'The ETF Rally',
      dateRangeStart: '2024-01-01',
      dateRangeEnd: '2024-01-31',
      importanceScore: 80,
      content: { executiveSummary: 'Test' },
      renderedMarkdown: '# Test',
      token: {
        name: 'Bitcoin',
        symbol: 'BTC',
        slug: 'bitcoin',
        logoUrl: null,
      },
    });
  });
});
