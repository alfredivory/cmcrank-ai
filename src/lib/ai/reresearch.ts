import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { getCommentsForResearch } from '@/lib/queries/comments';
import { classifyCommentsForReresearch } from './classify-comments';
import { executeResearch } from './execute';

/**
 * Execute a re-research based on user feedback and comments.
 * Creates a new version of the research with comment context.
 */
export async function executeReresearch(
  originalResearchId: string,
  triggeredByUserId: string
): Promise<{ researchId: string }> {
  const logger = createLogger('api');

  logger.info('reresearch.start', {
    userId: triggeredByUserId,
    metadata: { originalResearchId },
  });

  // 1. Load original research
  const original = await prisma.research.findUniqueOrThrow({
    where: { id: originalResearchId },
    include: { token: true },
  });

  if (original.status !== 'COMPLETE') {
    throw new Error('Can only re-research COMPLETE research');
  }

  // 2. Load and classify comments
  const comments = await getCommentsForResearch(
    originalResearchId,
    original.version
  );

  const classified = await classifyCommentsForReresearch(
    comments,
    original.renderedMarkdown || JSON.stringify(original.content),
    logger
  );

  const criticalComments = classified.filter((c) => c.classification === 'CRITICAL');

  // 3. Build user context from critical comments
  let userContext: string | null = null;
  if (criticalComments.length > 0) {
    userContext = [
      'User feedback that prompted this re-research:',
      ...criticalComments.map((c) => `- ${c.content.slice(0, 500)}`),
    ].join('\n');
  }

  // 4. Create new research record
  const newResearch = await prisma.research.create({
    data: {
      tokenId: original.tokenId,
      dateRangeStart: original.dateRangeStart,
      dateRangeEnd: original.dateRangeEnd,
      triggeredByUserId,
      userContext,
      status: 'PENDING',
      version: original.version + 1,
      parentResearchId: original.id,
    },
  });

  logger.info('reresearch.created', {
    userId: triggeredByUserId,
    metadata: {
      originalResearchId,
      newResearchId: newResearch.id,
      newVersion: original.version + 1,
      criticalCommentCount: criticalComments.length,
    },
  });

  // 5. Fire and forget the research execution
  void executeResearch(newResearch.id).catch((error) => {
    logger.error('reresearch.execution_error', error as Error, {
      metadata: { researchId: newResearch.id },
    });
  });

  return { researchId: newResearch.id };
}
