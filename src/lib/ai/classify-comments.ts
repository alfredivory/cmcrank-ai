import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '@/lib/logger';
import { getClassificationConfig } from './config';
import type { CommentItem } from '@/types/comments';

export type CommentClassification = 'CRITICAL' | 'MINOR' | 'IRRELEVANT';

export interface ClassifiedComment {
  commentId: string;
  content: string;
  classification: CommentClassification;
}

/**
 * Classify comments by their relevance for re-research.
 * Uses Haiku for fast, cheap classification.
 * Returns only non-deleted comments with their classifications.
 */
export async function classifyCommentsForReresearch(
  comments: CommentItem[],
  researchSummary: string,
  logger: Logger
): Promise<ClassifiedComment[]> {
  const config = getClassificationConfig();
  const startTime = Date.now();

  const nonDeleted = comments
    .flatMap((c) => [c, ...c.replies])
    .filter((c) => !c.isDeleted);

  if (nonDeleted.length === 0) {
    return [];
  }

  const commentList = nonDeleted
    .map((c, i) => `[${i}] (v${c.researchVersion}) ${c.author.name || 'Anonymous'}: ${c.content.slice(0, 500)}`)
    .join('\n');

  const systemPrompt = `You are a comment classifier for a cryptocurrency research platform. Classify each comment's relevance for triggering a re-research investigation.

Classifications:
- CRITICAL: Comment identifies factual errors, missing important events, outdated information, or significant gaps that would meaningfully change the research conclusions.
- MINOR: Comment provides small corrections, additional context, or minor updates that wouldn't change the overall findings.
- IRRELEVANT: Comment is off-topic, purely social (thanks, great work), or doesn't contain actionable research feedback.

Respond with ONLY a JSON array of objects: [{"index": 0, "classification": "CRITICAL"}, ...]
One entry per comment, in order. No explanation, just the JSON.`;

  const userMessage = `Research summary:
${researchSummary.slice(0, 2000)}

Comments to classify:
${commentList}`;

  logger.info('classify.comments.start', {
    metadata: {
      model: config.model,
      commentCount: nonDeleted.length,
    },
  });

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const durationMs = Date.now() - startTime;

    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Parse JSON response
    let classifications: { index: number; classification: CommentClassification }[];
    try {
      const jsonMatch = textContent.match(/\[[\s\S]*\]/);
      classifications = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      logger.warn('classify.comments.parse_failed', {
        metadata: { rawResponse: textContent.slice(0, 500) },
      });
      return [];
    }

    const results: ClassifiedComment[] = [];
    for (const entry of classifications) {
      const comment = nonDeleted[entry.index];
      if (comment && ['CRITICAL', 'MINOR', 'IRRELEVANT'].includes(entry.classification)) {
        results.push({
          commentId: comment.id,
          content: comment.content,
          classification: entry.classification,
        });
      }
    }

    const criticalCount = results.filter((r) => r.classification === 'CRITICAL').length;

    logger.info('classify.comments.complete', {
      durationMs,
      metadata: {
        model: config.model,
        commentCount: nonDeleted.length,
        criticalCount,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });

    return results;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('classify.comments.failed', error as Error, {
      durationMs,
      metadata: { model: config.model },
    });
    throw error;
  }
}
