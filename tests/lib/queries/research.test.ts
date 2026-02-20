import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    research: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';
import {
  findOverlappingResearch,
  getResearchById,
  getResearchForToken,
  getResearchStatus,
  findHiddenResearchForContext,
} from '@/lib/queries/research';

const mockFindMany = vi.mocked(prisma.research.findMany);
const mockFindFirst = vi.mocked(prisma.research.findFirst);
const mockFindUnique = vi.mocked(prisma.research.findUnique);
const mockCount = vi.mocked(prisma.research.count);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('findOverlappingResearch', () => {
  it('returns null when no candidates exist', async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await findOverlappingResearch('token1', new Date('2024-01-01'), new Date('2024-01-31'));
    expect(result).toBeNull();
  });

  it('returns match with 100% overlap', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'res1',
        dateRangeStart: new Date('2024-01-01'),
        dateRangeEnd: new Date('2024-01-31'),
      },
    ] as never);

    const result = await findOverlappingResearch('token1', new Date('2024-01-01'), new Date('2024-01-31'));
    expect(result?.id).toBe('res1');
  });

  it('returns match when overlap >= 80%', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'res1',
        dateRangeStart: new Date('2024-01-01'),
        dateRangeEnd: new Date('2024-01-31'),
      },
    ] as never);

    const result = await findOverlappingResearch('token1', new Date('2024-01-01'), new Date('2024-01-25'));
    expect(result?.id).toBe('res1');
  });

  it('returns null when overlap < 80%', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'res1',
        dateRangeStart: new Date('2024-01-15'),
        dateRangeEnd: new Date('2024-01-31'),
      },
    ] as never);

    const result = await findOverlappingResearch('token1', new Date('2024-01-01'), new Date('2024-01-31'));
    expect(result).toBeNull();
  });

  it('returns null when no overlap at all', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'res1',
        dateRangeStart: new Date('2024-03-01'),
        dateRangeEnd: new Date('2024-03-31'),
      },
    ] as never);

    const result = await findOverlappingResearch('token1', new Date('2024-01-01'), new Date('2024-01-31'));
    expect(result).toBeNull();
  });

  it('returns first match with sufficient overlap from multiple candidates', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'res1',
        dateRangeStart: new Date('2024-01-01'),
        dateRangeEnd: new Date('2024-01-31'),
      },
      {
        id: 'res2',
        dateRangeStart: new Date('2024-01-05'),
        dateRangeEnd: new Date('2024-02-05'),
      },
    ] as never);

    const result = await findOverlappingResearch('token1', new Date('2024-01-01'), new Date('2024-01-31'));
    expect(result?.id).toBe('res1');
  });

  it('only queries visible research (isVisible: true)', async () => {
    mockFindMany.mockResolvedValue([]);
    await findOverlappingResearch('token1', new Date('2024-01-01'), new Date('2024-01-31'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isVisible: true }),
      })
    );
  });
});

describe('getResearchById', () => {
  it('returns null when not found', async () => {
    mockFindFirst.mockResolvedValue(null);
    const result = await getResearchById('nonexistent');
    expect(result).toBeNull();
  });

  it('returns full research detail when found', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'res1',
      tokenId: 'token1',
      dateRangeStart: new Date('2024-01-01'),
      dateRangeEnd: new Date('2024-01-31'),
      status: 'COMPLETE',
      content: { executiveSummary: 'Test' },
      renderedMarkdown: '# Test',
      importanceScore: 80,
      userContext: null,
      parentResearchId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      token: { id: 'token1', name: 'Bitcoin', symbol: 'BTC', slug: 'bitcoin', logoUrl: null, cmcId: 1 },
      events: [],
    } as never);

    const result = await getResearchById('res1');
    expect(result).not.toBeNull();
    expect(result?.token.name).toBe('Bitcoin');
    expect(result?.status).toBe('COMPLETE');
  });

  it('returns null for hidden research by default', async () => {
    mockFindFirst.mockResolvedValue(null);
    await getResearchById('hidden-res');

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'hidden-res', isVisible: true }),
      })
    );
  });

  it('returns hidden research with includeHidden: true', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'hidden-res',
      tokenId: 'token1',
      dateRangeStart: new Date('2024-01-01'),
      dateRangeEnd: new Date('2024-01-31'),
      status: 'COMPLETE',
      content: null,
      renderedMarkdown: null,
      importanceScore: 50,
      userContext: null,
      parentResearchId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      token: { id: 'token1', name: 'Bitcoin', symbol: 'BTC', slug: 'bitcoin', logoUrl: null, cmcId: 1 },
      events: [],
    } as never);

    const result = await getResearchById('hidden-res', { includeHidden: true });
    expect(result).not.toBeNull();

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'hidden-res' },
      })
    );
  });
});

describe('getResearchForToken', () => {
  it('returns paginated list and total', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'res1',
        title: 'Test Title',
        dateRangeStart: new Date('2024-01-01'),
        dateRangeEnd: new Date('2024-01-31'),
        status: 'COMPLETE',
        importanceScore: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never);
    mockCount.mockResolvedValue(1);

    const result = await getResearchForToken('token1', { limit: 10, offset: 0 });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].title).toBe('Test Title');
  });

  it('respects limit and offset', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getResearchForToken('token1', { limit: 5, offset: 10 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5, skip: 10 })
    );
  });

  it('selects title field', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getResearchForToken('token1', { limit: 10, offset: 0 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ title: true }),
      })
    );
  });

  it('excludes hidden research by default', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getResearchForToken('token1', { limit: 10, offset: 0 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isVisible: true }),
      })
    );
  });

  it('includes hidden research with includeHidden: true', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getResearchForToken('token1', { limit: 10, offset: 0, includeHidden: true });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ isVisible: true }),
      })
    );
  });
});

describe('getResearchStatus', () => {
  it('returns lightweight status', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'res1',
      status: 'RUNNING',
      importanceScore: 50,
      updatedAt: new Date(),
    } as never);

    const result = await getResearchStatus('res1');
    expect(result?.status).toBe('RUNNING');
  });

  it('returns null when not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await getResearchStatus('nonexistent');
    expect(result).toBeNull();
  });

  it('returns status regardless of visibility', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'res1',
      status: 'RUNNING',
      importanceScore: 50,
      updatedAt: new Date(),
    } as never);

    await getResearchStatus('res1');
    // Should NOT have isVisible in the where clause
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'res1' },
      select: expect.any(Object),
    });
  });
});

describe('findHiddenResearchForContext', () => {
  it('returns hidden COMPLETE overlapping records', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'hidden1',
        renderedMarkdown: '# Old Report',
        dateRangeStart: new Date('2024-01-01'),
        dateRangeEnd: new Date('2024-01-31'),
      },
    ] as never);

    const result = await findHiddenResearchForContext('token1', new Date('2024-01-01'), new Date('2024-01-31'));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('hidden1');
  });

  it('queries with correct filters', async () => {
    mockFindMany.mockResolvedValue([]);
    const start = new Date('2024-01-01');
    const end = new Date('2024-01-31');

    await findHiddenResearchForContext('token1', start, end);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tokenId: 'token1',
          status: 'COMPLETE',
          isVisible: false,
          dateRangeStart: { lte: end },
          dateRangeEnd: { gte: start },
        }),
        take: 3,
      })
    );
  });

  it('returns at most 3 records', async () => {
    mockFindMany.mockResolvedValue([]);
    await findHiddenResearchForContext('token1', new Date('2024-01-01'), new Date('2024-01-31'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 })
    );
  });
});
