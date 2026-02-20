import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();

// Mock the Anthropic SDK — class constructor
vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: mockCreate };
  }
  return { default: MockAnthropic };
});

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }),
}));

// Mock config
vi.mock('@/lib/ai/config', () => ({
  getResearchConfig: () => ({
    model: 'claude-opus-4-6',
    maxSearches: 20,
    maxTokens: 16384,
  }),
}));

import { AnthropicResearchClient } from '@/lib/ai/client';

const validAIJson = JSON.stringify({
  report: {
    executiveSummary: 'Test summary.',
    findings: [{ title: 'Finding 1', content: 'Content here.' }],
    sources: [{ url: 'https://example.com', title: 'Source', domain: 'example.com' }],
  },
  events: [
    {
      date: '2024-01-10',
      title: 'Test event',
      description: 'Test description',
      eventType: 'MARKET',
      sourceUrl: null,
      importanceScore: 70,
    },
  ],
  overallImportanceScore: 75,
});

const baseParams = {
  tokenName: 'Bitcoin',
  tokenSymbol: 'BTC',
  currentRank: 1,
  dateRangeStart: '2024-01-01',
  dateRangeEnd: '2024-01-31',
  rankDataPoints: [{ date: '2024-01-01', rank: 1 }],
};

describe('AnthropicResearchClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws if no API key provided', () => {
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => new AnthropicResearchClient('')).toThrow('ANTHROPIC_API_KEY is required');
    process.env.ANTHROPIC_API_KEY = original;
  });

  it('returns validated response on success', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validAIJson }],
      usage: { input_tokens: 1000, output_tokens: 2000 },
      stop_reason: 'end_turn',
    });

    const client = new AnthropicResearchClient('test-key');
    const result = await client.research(baseParams);
    expect(result.report.executiveSummary).toBe('Test summary.');
    expect(result.events).toHaveLength(1);
    expect(result.overallImportanceScore).toBe(75);
  });

  it('handles JSON wrapped in markdown code fences', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '```json\n' + validAIJson + '\n```' }],
      usage: { input_tokens: 1000, output_tokens: 2000 },
      stop_reason: 'end_turn',
    });

    const client = new AnthropicResearchClient('test-key');
    const result = await client.research(baseParams);
    expect(result.report.executiveSummary).toBe('Test summary.');
  });

  it('extracts citations from web search result blocks', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: validAIJson,
          citations: [
            {
              type: 'web_search_result_location',
              url: 'https://reuters.com/crypto',
              title: 'Reuters Crypto',
            },
          ],
        },
      ],
      usage: { input_tokens: 1000, output_tokens: 2000 },
      stop_reason: 'end_turn',
    });

    const client = new AnthropicResearchClient('test-key');
    const result = await client.research(baseParams);
    const urls = result.report.sources.map((s) => s.url);
    expect(urls).toContain('https://reuters.com/crypto');
  });

  it('does not duplicate citations already in sources', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: validAIJson,
          citations: [
            {
              type: 'web_search_result_location',
              url: 'https://example.com',
              title: 'Duplicate',
            },
          ],
        },
      ],
      usage: { input_tokens: 1000, output_tokens: 2000 },
      stop_reason: 'end_turn',
    });

    const client = new AnthropicResearchClient('test-key');
    const result = await client.research(baseParams);
    const exampleUrls = result.report.sources.filter((s) => s.url === 'https://example.com');
    expect(exampleUrls).toHaveLength(1);
  });

  it('throws on API error', async () => {
    mockCreate.mockRejectedValue(new Error('API rate limit exceeded'));

    const client = new AnthropicResearchClient('test-key');
    await expect(client.research(baseParams)).rejects.toThrow('API rate limit exceeded');
  });

  it('throws on invalid JSON response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'This is not JSON at all' }],
      usage: { input_tokens: 1000, output_tokens: 500 },
      stop_reason: 'end_turn',
    });

    const client = new AnthropicResearchClient('test-key');
    await expect(client.research(baseParams)).rejects.toThrow();
  });

  it('passes user context to message when provided', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validAIJson }],
      usage: { input_tokens: 1000, output_tokens: 2000 },
      stop_reason: 'end_turn',
    });

    const client = new AnthropicResearchClient('test-key');
    await client.research({ ...baseParams, userContext: 'Check the ETF news' });

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain('Check the ETF news');
  });

  it('configures web search tool with maxSearches', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validAIJson }],
      usage: { input_tokens: 1000, output_tokens: 2000 },
      stop_reason: 'end_turn',
    });

    const client = new AnthropicResearchClient('test-key');
    await client.research(baseParams);

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.tools).toEqual([
      { type: 'web_search_20250305', name: 'web_search', max_uses: 20 },
    ]);
  });
});
