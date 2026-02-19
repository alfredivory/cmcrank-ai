import Anthropic from '@anthropic-ai/sdk';
import { createLogger, Logger } from '@/lib/logger';
import { getResearchConfig } from './config';
import { buildResearchSystemPrompt, buildResearchUserMessage } from './prompts';
import { validateResearchResponse } from './schema';
import type { ResearchAIResponse, ResearchRequestParams } from './types';

export class AnthropicResearchClient {
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
   * Run a research investigation. Single API call with web search tool.
   * Returns validated, structured response.
   */
  async research(params: ResearchRequestParams): Promise<ResearchAIResponse> {
    const config = getResearchConfig();
    const startTime = Date.now();

    this.logger.info('research.ai.start', {
      metadata: {
        model: config.model,
        tokenName: params.tokenName,
        tokenSymbol: params.tokenSymbol,
        dateRange: `${params.dateRangeStart} to ${params.dateRangeEnd}`,
        maxSearches: config.maxSearches,
        hasUserContext: !!params.userContext,
      },
    });

    try {
      const response = await this.client.messages.create({
        model: config.model,
        max_tokens: config.maxTokens,
        system: buildResearchSystemPrompt(),
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: config.maxSearches,
          },
        ],
        messages: [
          {
            role: 'user',
            content: buildResearchUserMessage(params),
          },
        ],
      });

      const durationMs = Date.now() - startTime;

      // Extract text from response content blocks
      const textContent = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      // Extract citations from response content blocks
      const citations = this.extractCitations(response.content);

      this.logger.info('research.ai.complete', {
        durationMs,
        metadata: {
          model: config.model,
          tokenName: params.tokenName,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          citationsFound: citations.length,
          stopReason: response.stop_reason,
        },
      });

      // Parse JSON from text response
      const parsed = this.parseJsonResponse(textContent);
      const validated = validateResearchResponse(parsed);

      // Merge any citations from web search into sources
      if (citations.length > 0) {
        const existingUrls = new Set(validated.report.sources.map((s) => s.url));
        for (const citation of citations) {
          if (!existingUrls.has(citation.url)) {
            validated.report.sources.push(citation);
            existingUrls.add(citation.url);
          }
        }
      }

      return validated;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.logger.error('research.ai.error', error as Error, {
        durationMs,
        metadata: {
          model: config.model,
          tokenName: params.tokenName,
        },
      });
      throw error;
    }
  }

  /**
   * Parse JSON from the AI text response, handling potential markdown fences.
   */
  private parseJsonResponse(text: string): unknown {
    let jsonText = text.trim();

    // Strip markdown code fences if present
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim();
    }

    try {
      return JSON.parse(jsonText);
    } catch {
      // Try to find JSON object within the text
      const objectMatch = jsonText.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }
      throw new Error('Failed to parse JSON from AI response');
    }
  }

  /**
   * Extract citation URLs from web search result content blocks.
   */
  private extractCitations(
    content: Anthropic.Messages.ContentBlock[]
  ): { url: string; title: string; domain: string }[] {
    const citations: { url: string; title: string; domain: string }[] = [];
    const seen = new Set<string>();

    for (const block of content) {
      if (block.type === 'text' && block.citations) {
        for (const citation of block.citations) {
          if (citation.type === 'web_search_result_location' && citation.url && !seen.has(citation.url)) {
            seen.add(citation.url);
            let domain = 'unknown';
            try {
              domain = new URL(citation.url).hostname.replace(/^www\./, '');
            } catch {
              // ignore
            }
            citations.push({
              url: citation.url,
              title: citation.title || citation.url,
              domain,
            });
          }
        }
      }
    }

    return citations;
  }
}

// Singleton instance
let researchClient: AnthropicResearchClient | null = null;

export function getAnthropicResearchClient(logger?: Logger): AnthropicResearchClient {
  if (!researchClient) {
    researchClient = new AnthropicResearchClient(undefined, logger);
  }
  return researchClient;
}
