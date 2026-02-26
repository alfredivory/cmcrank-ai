import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CommentItem } from '@/types/comments';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: mockCreate };
  }
  return { default: MockAnthropic };
});

vi.mock('@/lib/ai/config', () => ({
  getClassificationConfig: () => ({
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 2048,
  }),
}));

import { classifyCommentsForReresearch } from '@/lib/ai/classify-comments';

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(),
  getCorrelationId: vi.fn(),
};

function makeComment(overrides: Partial<CommentItem> = {}): CommentItem {
  return {
    id: 'c1',
    researchId: 'res1',
    researchVersion: 1,
    content: 'Test comment',
    citedText: null,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    author: { id: 'u1', name: 'Alice', image: null },
    reactions: { UPVOTE: 0, DOWNVOTE: 0, FIRE: 0, LIGHTBULB: 0, THINKING: 0, HUNDRED: 0 },
    userReactions: [],
    replies: [],
    score: 10,
    ...overrides,
  };
}

describe('classifyCommentsForReresearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  it('returns empty array for no comments', async () => {
    const result = await classifyCommentsForReresearch(
      [], 'Research summary', mockLogger as never
    );
    expect(result).toEqual([]);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('skips deleted comments', async () => {
    const result = await classifyCommentsForReresearch(
      [makeComment({ isDeleted: true })],
      'Research summary',
      mockLogger as never
    );
    expect(result).toEqual([]);
  });

  it('classifies comments correctly', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '[{"index": 0, "classification": "CRITICAL"}, {"index": 1, "classification": "MINOR"}]' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const result = await classifyCommentsForReresearch(
      [
        makeComment({ id: 'c1', content: 'The ETF date is wrong' }),
        makeComment({ id: 'c2', content: 'Nice report' }),
      ],
      'Research summary',
      mockLogger as never
    );

    expect(result).toHaveLength(2);
    expect(result[0].classification).toBe('CRITICAL');
    expect(result[1].classification).toBe('MINOR');
  });

  it('handles malformed JSON response gracefully', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '[not valid json at all]' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const result = await classifyCommentsForReresearch(
      [makeComment()],
      'Research summary',
      mockLogger as never
    );

    expect(result).toEqual([]);
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('includes replies in classification', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '[{"index": 0, "classification": "CRITICAL"}, {"index": 1, "classification": "IRRELEVANT"}]' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const parent = makeComment({
      id: 'c1',
      content: 'Main comment',
      replies: [makeComment({ id: 'c2', content: 'Reply' })],
    });

    const result = await classifyCommentsForReresearch(
      [parent],
      'Research summary',
      mockLogger as never
    );

    expect(result).toHaveLength(2);
  });

  it('throws on API error', async () => {
    mockCreate.mockRejectedValue(new Error('Rate limited'));

    await expect(
      classifyCommentsForReresearch(
        [makeComment()],
        'Research summary',
        mockLogger as never
      )
    ).rejects.toThrow('Rate limited');
  });
});
