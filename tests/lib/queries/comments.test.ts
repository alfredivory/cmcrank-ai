import { describe, it, expect, vi, beforeEach } from 'vitest';

// Prisma mock setup
const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockDeleteMany = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    researchComment: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    commentReaction: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
    },
  },
}));

import {
  computeCommentScore,
  getCommentsForResearch,
  createComment,
  softDeleteComment,
} from '@/lib/queries/comments';

describe('computeCommentScore', () => {
  it('gives higher score to comments on the current version', () => {
    const current = computeCommentScore(3, 3, 0, 0, false);
    const old = computeCommentScore(1, 3, 0, 0, false);
    expect(current).toBeGreaterThan(old);
  });

  it('boosts score for upvotes', () => {
    const withUpvotes = computeCommentScore(1, 1, 5, 0, false);
    const withoutUpvotes = computeCommentScore(1, 1, 0, 0, false);
    expect(withUpvotes).toBeGreaterThan(withoutUpvotes);
  });

  it('reduces score for downvotes', () => {
    const withDownvotes = computeCommentScore(1, 1, 0, 5, false);
    const withoutDownvotes = computeCommentScore(1, 1, 0, 0, false);
    expect(withDownvotes).toBeLessThan(withoutDownvotes);
  });

  it('adds author boost when viewer is author', () => {
    const author = computeCommentScore(1, 1, 0, 0, true);
    const notAuthor = computeCommentScore(1, 1, 0, 0, false);
    expect(author - notAuthor).toBe(2);
  });

  it('combines all factors correctly', () => {
    const score = computeCommentScore(2, 3, 4, 1, true);
    // recency = 10 / (1 + 1) = 5
    // reactions = (4 - 1) * 0.5 = 1.5
    // author_boost = 2
    expect(score).toBe(8.5);
  });
});

describe('getCommentsForResearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no comments', async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await getCommentsForResearch('res1', 1);
    expect(result).toEqual([]);
  });

  it('builds tree with replies attached to parent', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'c1', researchId: 'res1', userId: 'u1', parentCommentId: null,
        researchVersion: 1, content: 'Root', citedText: null, isDeleted: false,
        createdAt: new Date('2024-01-01'),
        user: { id: 'u1', name: 'Alice', image: null },
        reactions: [],
      },
      {
        id: 'c2', researchId: 'res1', userId: 'u2', parentCommentId: 'c1',
        researchVersion: 1, content: 'Reply', citedText: null, isDeleted: false,
        createdAt: new Date('2024-01-02'),
        user: { id: 'u2', name: 'Bob', image: null },
        reactions: [],
      },
    ]);

    const result = await getCommentsForResearch('res1', 1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
    expect(result[0].replies).toHaveLength(1);
    expect(result[0].replies[0].id).toBe('c2');
  });

  it('sorts by score descending', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'c1', researchId: 'res1', userId: 'u1', parentCommentId: null,
        researchVersion: 1, content: 'Low score', citedText: null, isDeleted: false,
        createdAt: new Date('2024-01-01'),
        user: { id: 'u1', name: 'Alice', image: null },
        reactions: [],
      },
      {
        id: 'c2', researchId: 'res1', userId: 'u2', parentCommentId: null,
        researchVersion: 1, content: 'High score', citedText: null, isDeleted: false,
        createdAt: new Date('2024-01-02'),
        user: { id: 'u2', name: 'Bob', image: null },
        reactions: [
          { type: 'UPVOTE', userId: 'u1' },
          { type: 'UPVOTE', userId: 'u3' },
          { type: 'UPVOTE', userId: 'u4' },
        ],
      },
    ]);

    const result = await getCommentsForResearch('res1', 1);
    expect(result[0].id).toBe('c2');
    expect(result[1].id).toBe('c1');
  });

  it('masks deleted comment content', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'c1', researchId: 'res1', userId: 'u1', parentCommentId: null,
        researchVersion: 1, content: 'Secret', citedText: 'Citation', isDeleted: true,
        createdAt: new Date('2024-01-01'),
        user: { id: 'u1', name: 'Alice', image: null },
        reactions: [],
      },
    ]);

    const result = await getCommentsForResearch('res1', 1);
    expect(result[0].content).toBe('[deleted]');
    expect(result[0].citedText).toBeNull();
    expect(result[0].author.name).toBeNull();
  });

  it('populates userReactions for logged-in user', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'c1', researchId: 'res1', userId: 'u2', parentCommentId: null,
        researchVersion: 1, content: 'Test', citedText: null, isDeleted: false,
        createdAt: new Date('2024-01-01'),
        user: { id: 'u2', name: 'Bob', image: null },
        reactions: [
          { type: 'UPVOTE', userId: 'u1' },
          { type: 'FIRE', userId: 'u1' },
          { type: 'UPVOTE', userId: 'u3' },
        ],
      },
    ]);

    const result = await getCommentsForResearch('res1', 1, 'u1');
    expect(result[0].userReactions).toContain('UPVOTE');
    expect(result[0].userReactions).toContain('FIRE');
    expect(result[0].reactions.UPVOTE).toBe(2);
  });
});

describe('createComment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a root comment', async () => {
    mockCreate.mockResolvedValue({ id: 'new1' });

    const result = await createComment({
      researchId: 'res1',
      userId: 'u1',
      researchVersion: 1,
      content: 'Hello world',
    });
    expect(result.id).toBe('new1');
  });

  it('enforces max depth of 2 for replies', async () => {
    // Parent is already a reply (has a parentCommentId)
    mockFindUnique.mockResolvedValue({ parentCommentId: 'c0' });

    await expect(
      createComment({
        researchId: 'res1',
        userId: 'u1',
        researchVersion: 1,
        content: 'Too deep',
        parentCommentId: 'c1',
      })
    ).rejects.toThrow('Maximum reply depth exceeded');
  });
});

describe('softDeleteComment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false for non-existent comment', async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await softDeleteComment('c1', 'u1', false);
    expect(result).toBe(false);
  });

  it('returns false for already-deleted comment', async () => {
    mockFindUnique.mockResolvedValue({ userId: 'u1', isDeleted: true });
    const result = await softDeleteComment('c1', 'u1', false);
    expect(result).toBe(false);
  });

  it('returns false when user is not author and not admin', async () => {
    mockFindUnique.mockResolvedValue({ userId: 'u2', isDeleted: false });
    const result = await softDeleteComment('c1', 'u1', false);
    expect(result).toBe(false);
  });

  it('deletes when user is author', async () => {
    mockFindUnique.mockResolvedValue({ userId: 'u1', isDeleted: false });
    mockUpdate.mockResolvedValue({});
    const result = await softDeleteComment('c1', 'u1', false);
    expect(result).toBe(true);
  });

  it('deletes when user is admin', async () => {
    mockFindUnique.mockResolvedValue({ userId: 'u2', isDeleted: false });
    mockUpdate.mockResolvedValue({});
    const result = await softDeleteComment('c1', 'u1', true);
    expect(result).toBe(true);
  });
});
