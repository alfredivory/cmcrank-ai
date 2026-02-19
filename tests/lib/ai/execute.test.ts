import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ResearchAIResponse } from '@/lib/ai/types';

const {
  mockResearchFindUniqueOrThrow,
  mockResearchUpdate,
  mockEventCreateMany,
  mockTransaction,
  mockGetSnapshotHistory,
  mockAIResearch,
  mockFindHiddenResearchForContext,
} = vi.hoisted(() => ({
  mockResearchFindUniqueOrThrow: vi.fn(),
  mockResearchUpdate: vi.fn(),
  mockEventCreateMany: vi.fn(),
  mockTransaction: vi.fn(),
  mockGetSnapshotHistory: vi.fn(),
  mockAIResearch: vi.fn(),
  mockFindHiddenResearchForContext: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    research: {
      findUniqueOrThrow: mockResearchFindUniqueOrThrow,
      update: mockResearchUpdate,
    },
    event: {
      createMany: mockEventCreateMany,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }),
}));

vi.mock('@/lib/queries/tokens', () => ({
  getSnapshotHistory: (...args: unknown[]) => mockGetSnapshotHistory(...args),
}));

vi.mock('@/lib/queries/research', () => ({
  findHiddenResearchForContext: (...args: unknown[]) => mockFindHiddenResearchForContext(...args),
}));

vi.mock('@/lib/ai/client', () => ({
  getAnthropicResearchClient: () => ({
    research: mockAIResearch,
  }),
}));

import { executeResearch, renderResearchReport } from '@/lib/ai/execute';

const sampleAIResponse: ResearchAIResponse = {
  title: 'The ETF Rally',
  report: {
    executiveSummary: 'Bitcoin gained rank due to ETF approval.',
    findings: [
      { title: 'ETF Impact', content: 'The spot ETF approval drove institutional interest.' },
    ],
    sources: [
      { url: 'https://example.com', title: 'ETF News', domain: 'example.com' },
    ],
  },
  events: [
    {
      date: '2024-01-10',
      title: 'Spot ETF Approved',
      description: 'SEC approved spot Bitcoin ETFs',
      eventType: 'REGULATORY',
      sourceUrl: 'https://example.com',
      importanceScore: 90,
    },
  ],
  overallImportanceScore: 85,
};

const mockResearchRecord = {
  id: 'res1',
  tokenId: 'token1',
  dateRangeStart: new Date('2024-01-01'),
  dateRangeEnd: new Date('2024-01-31'),
  userContext: null,
  triggeredByUserId: 'user1',
  token: {
    id: 'token1',
    name: 'Bitcoin',
    symbol: 'BTC',
    slug: 'bitcoin',
    cmcId: 1,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockResearchFindUniqueOrThrow.mockResolvedValue(mockResearchRecord);
  mockResearchUpdate.mockResolvedValue({});
  mockGetSnapshotHistory.mockResolvedValue([
    { date: '2024-01-01', rank: 5, marketCap: 100, price: 50000, volume24h: 1000, circulatingSupply: 19000000 },
    { date: '2024-01-31', rank: 3, marketCap: 120, price: 55000, volume24h: 1200, circulatingSupply: 19000000 },
  ]);
  mockAIResearch.mockResolvedValue(sampleAIResponse);
  mockFindHiddenResearchForContext.mockResolvedValue([]);
  mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
    const tx = {
      research: { update: mockResearchUpdate },
      event: { createMany: mockEventCreateMany },
    };
    await fn(tx);
  });
});

describe('executeResearch', () => {
  it('completes full research flow successfully', async () => {
    await executeResearch('res1');

    expect(mockResearchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'res1' },
        data: { status: 'RUNNING' },
      })
    );

    expect(mockAIResearch).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenName: 'Bitcoin',
        tokenSymbol: 'BTC',
        dateRangeStart: '2024-01-01',
        dateRangeEnd: '2024-01-31',
      })
    );

    expect(mockResearchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'res1' },
        data: expect.objectContaining({
          status: 'COMPLETE',
          importanceScore: 85,
        }),
      })
    );
  });

  it('creates events from AI response', async () => {
    await executeResearch('res1');

    expect(mockEventCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          tokenId: 'token1',
          title: 'Spot ETF Approved',
          eventType: 'REGULATORY',
          researchId: 'res1',
        }),
      ]),
    });
  });

  it('sets status to FAILED on AI error', async () => {
    mockAIResearch.mockRejectedValue(new Error('API error'));

    await executeResearch('res1');

    expect(mockResearchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'res1' },
        data: { status: 'FAILED' },
      })
    );
  });

  it('sets status to FAILED on DB error', async () => {
    mockResearchFindUniqueOrThrow.mockRejectedValue(new Error('DB error'));

    await executeResearch('res1');

    expect(mockResearchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'FAILED' },
      })
    );
  });

  it('passes user context to AI when present', async () => {
    mockResearchFindUniqueOrThrow.mockResolvedValue({
      ...mockResearchRecord,
      userContext: 'Check the ETF news',
    });

    await executeResearch('res1');

    expect(mockAIResearch).toHaveBeenCalledWith(
      expect.objectContaining({
        userContext: 'Check the ETF news',
      })
    );
  });

  it('handles empty events array', async () => {
    mockAIResearch.mockResolvedValue({
      ...sampleAIResponse,
      events: [],
    });

    await executeResearch('res1');

    expect(mockEventCreateMany).not.toHaveBeenCalled();
  });

  it('uses last snapshot rank as current rank', async () => {
    await executeResearch('res1');

    expect(mockAIResearch).toHaveBeenCalledWith(
      expect.objectContaining({
        currentRank: 3,
      })
    );
  });

  it('handles empty snapshot history', async () => {
    mockGetSnapshotHistory.mockResolvedValue([]);

    await executeResearch('res1');

    expect(mockAIResearch).toHaveBeenCalledWith(
      expect.objectContaining({
        currentRank: 0,
        rankDataPoints: [],
      })
    );
  });

  it('does not throw even on failure', async () => {
    mockResearchFindUniqueOrThrow.mockRejectedValue(new Error('test'));
    await expect(executeResearch('res1')).resolves.toBeUndefined();
  });

  it('stores title in research update', async () => {
    await executeResearch('res1');

    expect(mockResearchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLETE',
          title: 'The ETF Rally',
        }),
      })
    );
  });

  it('stores rendered markdown in research', async () => {
    await executeResearch('res1');

    expect(mockResearchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          renderedMarkdown: expect.stringContaining('# Research: Bitcoin'),
        }),
      })
    );
  });

  it('passes hidden research findings as previousResearchFindings when found', async () => {
    mockFindHiddenResearchForContext.mockResolvedValue([
      {
        id: 'hidden1',
        renderedMarkdown: '# Old report about Bitcoin',
        dateRangeStart: new Date('2024-01-01'),
        dateRangeEnd: new Date('2024-01-31'),
      },
    ]);

    await executeResearch('res1');

    expect(mockFindHiddenResearchForContext).toHaveBeenCalledWith(
      'token1',
      mockResearchRecord.dateRangeStart,
      mockResearchRecord.dateRangeEnd
    );

    expect(mockAIResearch).toHaveBeenCalledWith(
      expect.objectContaining({
        previousResearchFindings: expect.stringContaining('Old report about Bitcoin'),
      })
    );
  });

  it('omits previousResearchFindings when no hidden research found', async () => {
    mockFindHiddenResearchForContext.mockResolvedValue([]);

    await executeResearch('res1');

    expect(mockAIResearch).toHaveBeenCalledWith(
      expect.objectContaining({
        previousResearchFindings: undefined,
      })
    );
  });
});

describe('renderResearchReport', () => {
  it('includes token name and date range', () => {
    const md = renderResearchReport(
      sampleAIResponse,
      'Bitcoin',
      new Date('2024-01-01'),
      new Date('2024-01-31')
    );
    expect(md).toContain('# Research: Bitcoin');
    expect(md).toContain('2024-01-01');
    expect(md).toContain('2024-01-31');
  });

  it('includes executive summary and findings', () => {
    const md = renderResearchReport(
      sampleAIResponse,
      'Bitcoin',
      new Date('2024-01-01'),
      new Date('2024-01-31')
    );
    expect(md).toContain('## Executive Summary');
    expect(md).toContain('Bitcoin gained rank');
    expect(md).toContain('## ETF Impact');
  });

  it('includes sources', () => {
    const md = renderResearchReport(
      sampleAIResponse,
      'Bitcoin',
      new Date('2024-01-01'),
      new Date('2024-01-31')
    );
    expect(md).toContain('## Sources');
    expect(md).toContain('[ETF News](https://example.com)');
  });
});
