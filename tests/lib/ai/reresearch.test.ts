import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockResearchFindUniqueOrThrow,
  mockResearchCreate,
  mockGetComments,
  mockClassifyComments,
  mockExecuteResearch,
} = vi.hoisted(() => ({
  mockResearchFindUniqueOrThrow: vi.fn(),
  mockResearchCreate: vi.fn(),
  mockGetComments: vi.fn(),
  mockClassifyComments: vi.fn(),
  mockExecuteResearch: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  }),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    research: {
      findUniqueOrThrow: (...args: unknown[]) => mockResearchFindUniqueOrThrow(...args),
      create: (...args: unknown[]) => mockResearchCreate(...args),
    },
  },
}));

vi.mock('@/lib/queries/comments', () => ({
  getCommentsForResearch: (...args: unknown[]) => mockGetComments(...args),
}));

vi.mock('@/lib/ai/classify-comments', () => ({
  classifyCommentsForReresearch: (...args: unknown[]) => mockClassifyComments(...args),
}));

vi.mock('@/lib/ai/execute', () => ({
  executeResearch: (...args: unknown[]) => mockExecuteResearch(...args),
}));

import { executeReresearch } from '@/lib/ai/reresearch';

describe('executeReresearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResearchFindUniqueOrThrow.mockResolvedValue({
      id: 'res1',
      tokenId: 'token1',
      status: 'COMPLETE',
      version: 1,
      dateRangeStart: new Date('2024-01-01'),
      dateRangeEnd: new Date('2024-01-31'),
      renderedMarkdown: 'Research content',
      content: null,
      token: { name: 'Bitcoin', symbol: 'BTC' },
    });
    mockGetComments.mockResolvedValue([]);
    mockClassifyComments.mockResolvedValue([]);
    mockResearchCreate.mockResolvedValue({ id: 'res2' });
    mockExecuteResearch.mockResolvedValue(undefined);
  });

  it('creates a new research with incremented version', async () => {
    const result = await executeReresearch('res1', 'u1');
    expect(result.researchId).toBe('res2');
    expect(mockResearchCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          version: 2,
          parentResearchId: 'res1',
          triggeredByUserId: 'u1',
        }),
      })
    );
  });

  it('includes critical comments as user context', async () => {
    mockClassifyComments.mockResolvedValue([
      { commentId: 'c1', content: 'ETF date is wrong', classification: 'CRITICAL' },
      { commentId: 'c2', content: 'Great work', classification: 'IRRELEVANT' },
    ]);

    await executeReresearch('res1', 'u1');

    const createCall = mockResearchCreate.mock.calls[0][0];
    expect(createCall.data.userContext).toContain('ETF date is wrong');
    expect(createCall.data.userContext).not.toContain('Great work');
  });

  it('sets null user context when no critical comments', async () => {
    mockClassifyComments.mockResolvedValue([
      { commentId: 'c1', content: 'Nice', classification: 'IRRELEVANT' },
    ]);

    await executeReresearch('res1', 'u1');

    const createCall = mockResearchCreate.mock.calls[0][0];
    expect(createCall.data.userContext).toBeNull();
  });

  it('fires executeResearch on new record', async () => {
    await executeReresearch('res1', 'u1');
    expect(mockExecuteResearch).toHaveBeenCalledWith('res2');
  });

  it('throws if original research is not COMPLETE', async () => {
    mockResearchFindUniqueOrThrow.mockResolvedValue({
      id: 'res1',
      status: 'RUNNING',
      version: 1,
      token: { name: 'Bitcoin', symbol: 'BTC' },
    });

    await expect(executeReresearch('res1', 'u1')).rejects.toThrow('COMPLETE');
  });
});
