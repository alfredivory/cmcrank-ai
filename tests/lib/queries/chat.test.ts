import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindMany = vi.fn();
const mockCreate = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    chatMessage: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

import { getChatHistory, saveChatMessage } from '@/lib/queries/chat';

describe('getChatHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns chat history sorted by createdAt', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'm1', role: 'USER', content: 'Hello', createdAt: new Date('2024-01-01') },
      { id: 'm2', role: 'ASSISTANT', content: 'Hi!', createdAt: new Date('2024-01-01') },
    ]);

    const result = await getChatHistory('res1', 'u1');
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('USER');
    expect(result[1].role).toBe('ASSISTANT');
  });

  it('filters by researchId and userId', async () => {
    mockFindMany.mockResolvedValue([]);

    await getChatHistory('res1', 'u1', 25);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { researchId: 'res1', userId: 'u1' },
        take: 25,
      })
    );
  });

  it('serializes dates to ISO strings', async () => {
    const date = new Date('2024-06-15T12:00:00Z');
    mockFindMany.mockResolvedValue([
      { id: 'm1', role: 'USER', content: 'Test', createdAt: date },
    ]);

    const result = await getChatHistory('res1', 'u1');
    expect(result[0].createdAt).toBe(date.toISOString());
  });
});

describe('saveChatMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a message and returns id', async () => {
    mockCreate.mockResolvedValue({ id: 'new1' });

    const result = await saveChatMessage({
      researchId: 'res1',
      userId: 'u1',
      role: 'USER',
      content: 'Hello world',
    });

    expect(result.id).toBe('new1');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          researchId: 'res1',
          userId: 'u1',
          role: 'USER',
          content: 'Hello world',
        },
      })
    );
  });
});
