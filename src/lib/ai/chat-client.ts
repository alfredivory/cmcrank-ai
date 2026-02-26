import Anthropic from '@anthropic-ai/sdk';
import { createLogger, Logger } from '@/lib/logger';
import { getChatConfig } from './config';
import { buildChatSystemPrompt } from './chat-prompts';
import type { CommentItem } from '@/types/comments';

interface ChatContext {
  tokenName: string;
  tokenSymbol: string;
  researchVersion: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  researchContent: string;
  comments: CommentItem[];
}

interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  content: string;
  suggestsReresearch: boolean;
}

const RERESEARCH_MARKER = '[SUGGEST_RERESEARCH]';

export class AnthropicChatClient {
  private client: Anthropic;
  private logger: Logger;

  constructor(apiKey?: string, logger?: Logger) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY || '';
    if (!key) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }
    this.client = new Anthropic({ apiKey: key });
    this.logger = logger || createLogger('api');
  }

  /**
   * Send a chat message with research context and conversation history.
   */
  async chat(
    userMessage: string,
    context: ChatContext,
    history: ChatHistoryMessage[]
  ): Promise<ChatResponse> {
    const config = getChatConfig();
    const startTime = Date.now();

    const systemPrompt = buildChatSystemPrompt({
      tokenName: context.tokenName,
      tokenSymbol: context.tokenSymbol,
      researchVersion: context.researchVersion,
      dateRangeStart: context.dateRangeStart,
      dateRangeEnd: context.dateRangeEnd,
      researchContent: context.researchContent,
      comments: context.comments,
    });

    // Truncate history to max context messages
    const truncatedHistory = history.slice(-config.maxContextMessages);

    const messages: Anthropic.Messages.MessageParam[] = [
      ...truncatedHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: userMessage },
    ];

    this.logger.info('chat.ai.start', {
      metadata: {
        model: config.model,
        tokenName: context.tokenName,
        historyLength: truncatedHistory.length,
      },
    });

    try {
      const response = await this.client.messages.create({
        model: config.model,
        max_tokens: config.maxTokens,
        system: systemPrompt,
        messages,
      });

      const durationMs = Date.now() - startTime;

      const textContent = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      const suggestsReresearch = textContent.includes(RERESEARCH_MARKER);
      const cleanContent = textContent.replace(RERESEARCH_MARKER, '').trim();

      this.logger.info('chat.ai.complete', {
        durationMs,
        metadata: {
          model: config.model,
          tokenName: context.tokenName,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          suggestsReresearch,
        },
      });

      return {
        content: cleanContent,
        suggestsReresearch,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.logger.error('chat.ai.error', error as Error, {
        durationMs,
        metadata: {
          model: config.model,
          tokenName: context.tokenName,
        },
      });
      throw error;
    }
  }
}

// Singleton instance
let chatClient: AnthropicChatClient | null = null;

export function getAnthropicChatClient(logger?: Logger): AnthropicChatClient {
  if (!chatClient) {
    chatClient = new AnthropicChatClient(undefined, logger);
  }
  return chatClient;
}
