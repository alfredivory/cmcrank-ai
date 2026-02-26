export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { requireAuth, isAuthError, getSession } from '@/lib/auth/helpers';
import { prisma } from '@/lib/db';
import { sanitizeCommentContent, sanitizeCitedText } from '@/lib/sanitize';
import { getCommentsForResearch, createComment } from '@/lib/queries/comments';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createRequestLogger(request, 'api');
  const { id: researchId } = await params;

  try {
    const research = await prisma.research.findUnique({
      where: { id: researchId },
      select: { id: true, version: true },
    });

    if (!research) {
      return NextResponse.json({ error: 'Research not found' }, { status: 404 });
    }

    // Optional auth — logged-in users see their own reactions highlighted
    const session = await getSession();
    const currentUserId = session?.user?.id;

    const comments = await getCommentsForResearch(
      researchId,
      research.version,
      currentUserId
    );

    logger.debug('research.comments.list', {
      metadata: { researchId, commentCount: comments.length },
    });

    return NextResponse.json({ data: comments });
  } catch (error) {
    logger.error('research.comments.list.failed', error as Error, {
      metadata: { researchId },
    });
    return NextResponse.json(
      { error: 'Failed to load comments' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createRequestLogger(request, 'api');
  const { id: researchId } = await params;

  try {
    const user = await requireAuth();
    if (isAuthError(user)) return user;

    if (!user.isAllowlisted) {
      return NextResponse.json(
        { error: 'Research access required to comment' },
        { status: 403 }
      );
    }

    const research = await prisma.research.findUnique({
      where: { id: researchId },
      select: { id: true, version: true, status: true },
    });

    if (!research) {
      return NextResponse.json({ error: 'Research not found' }, { status: 404 });
    }

    if (research.status !== 'COMPLETE') {
      return NextResponse.json(
        { error: 'Can only comment on completed research' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { content, citedText, parentCommentId } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    const sanitizedContent = sanitizeCommentContent(content);
    const sanitizedCitation = citedText ? sanitizeCitedText(citedText) : undefined;

    // Validate parent comment exists and belongs to same research
    if (parentCommentId) {
      const parent = await prisma.researchComment.findUnique({
        where: { id: parentCommentId },
        select: { researchId: true },
      });
      if (!parent || parent.researchId !== researchId) {
        return NextResponse.json(
          { error: 'Invalid parent comment' },
          { status: 400 }
        );
      }
    }

    const comment = await createComment({
      researchId,
      userId: user.id,
      researchVersion: research.version,
      content: sanitizedContent,
      citedText: sanitizedCitation,
      parentCommentId,
    });

    logger.info('research.comments.created', {
      userId: user.id,
      metadata: {
        researchId,
        commentId: comment.id,
        hasParent: !!parentCommentId,
        hasCitation: !!sanitizedCitation,
      },
    });

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create comment';
    if (message === 'Maximum reply depth exceeded') {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    logger.error('research.comments.create.failed', error as Error, {
      metadata: { researchId },
    });
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
