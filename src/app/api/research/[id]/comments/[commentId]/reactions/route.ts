export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { requireAuth, isAuthError } from '@/lib/auth/helpers';
import { prisma } from '@/lib/db';
import { toggleReaction } from '@/lib/queries/comments';
import type { ReactionType } from '@prisma/client';

const VALID_REACTIONS: ReactionType[] = [
  'UPVOTE', 'DOWNVOTE', 'FIRE', 'LIGHTBULB', 'THINKING', 'HUNDRED',
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const logger = createRequestLogger(request, 'api');
  const { id: researchId, commentId } = await params;

  try {
    const user = await requireAuth();
    if (isAuthError(user)) return user;

    if (!user.isAllowlisted) {
      return NextResponse.json(
        { error: 'Research access required to react' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type } = body;

    if (!type || !VALID_REACTIONS.includes(type as ReactionType)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_REACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify comment exists and belongs to this research
    const comment = await prisma.researchComment.findUnique({
      where: { id: commentId },
      select: { researchId: true },
    });

    if (!comment || comment.researchId !== researchId) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    const added = await toggleReaction(commentId, user.id, type as ReactionType);

    logger.info('research.comments.reaction', {
      userId: user.id,
      metadata: { researchId, commentId, type, added },
    });

    return NextResponse.json({ data: { added } });
  } catch (error) {
    logger.error('research.comments.reaction.failed', error as Error, {
      metadata: { researchId, commentId },
    });
    return NextResponse.json(
      { error: 'Failed to toggle reaction' },
      { status: 500 }
    );
  }
}
