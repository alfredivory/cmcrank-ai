import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: mockCreate };
  }
  return { default: MockAnthropic };
});

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  }),
}));

vi.mock('@/lib/ai/config', () => ({
  getChatConfig: () => ({
    model: 'claude-sonnet-4-6',
    maxTokens: 4096,
    maxContextMessages: 50,
  }),
}));

import { AnthropicChatClient } from '@/lib/ai/chat-client';

const mockContext = {
  tokenName: 'Bitcoin',
  tokenSymbol: 'BTC',
  researchVersion: 1,
  dateRangeStart: '2024-01-01',
  dateRangeEnd: '2024-01-31',
  researchContent: 'Some research about Bitcoin.',
  comments: [],
};

describe('AnthropicChatClient', () => {
  let client: AnthropicChatClient;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
    client = new AnthropicChatClient('test-key');
  });

  it('returns chat response content', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Bitcoin has been volatile recently.' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const result = await client.chat('What happened?', mockContext, []);
    expect(result.content).toBe('Bitcoin has been volatile recently.');
    expect(result.suggestsReresearch).toBe(false);
  });

  it('detects SUGGEST_RERESEARCH marker', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'There are gaps in this analysis. [SUGGEST_RERESEARCH]' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const result = await client.chat('Is this accurate?', mockContext, []);
    expect(result.suggestsReresearch).toBe(true);
    expect(result.content).not.toContain('[SUGGEST_RERESEARCH]');
  });

  it('passes conversation history to API', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Good question.' }],
      usage: { input_tokens: 200, output_tokens: 30 },
    });

    const history = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi there!' },
    ];

    await client.chat('Follow up', mockContext, history);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'Follow up' },
        ],
      })
    );
  });

  it('truncates history to maxContextMessages', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'OK' }],
      usage: { input_tokens: 100, output_tokens: 10 },
    });

    // Create 60 messages — should be truncated to last 50
    const history = Array.from({ length: 60 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `Message ${i}`,
    }));

    await client.chat('New message', mockContext, history);

    const call = mockCreate.mock.calls[0][0];
    // 50 history + 1 new message = 51
    expect(call.messages).toHaveLength(51);
    // First message should be #10 (60 - 50)
    expect(call.messages[0].content).toBe('Message 10');
  });

  it('throws on API error', async () => {
    mockCreate.mockRejectedValue(new Error('API rate limited'));

    await expect(client.chat('Test', mockContext, [])).rejects.toThrow('API rate limited');
  });

  it('throws when no API key provided', () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => new AnthropicChatClient('')).toThrow('ANTHROPIC_API_KEY is required');
  });
});
