export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { requireAuth, isAuthError } from '@/lib/auth/helpers';
import { prisma } from '@/lib/db';

const VALID_RATINGS = ['THUMBS_UP', 'THUMBS_DOWN'] as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createRequestLogger(request, 'api');
  const { id: researchId } = await params;

  try {
    const user = await requireAuth();
    if (isAuthError(user)) return user;

    const body = await request.json();
    const { rating, comment } = body;

    if (!rating || !VALID_RATINGS.includes(rating)) {
      return NextResponse.json(
        { error: 'rating must be THUMBS_UP or THUMBS_DOWN' },
        { status: 400 }
      );
    }

    // Verify research exists
    const research = await prisma.research.findUnique({ where: { id: researchId } });
    if (!research) {
      return NextResponse.json({ error: 'Research not found' }, { status: 404 });
    }

    // Upsert feedback (one per user per research)
    const feedback = await prisma.researchFeedback.upsert({
      where: {
        researchId_userId: { researchId, userId: user.id },
      },
      update: {
        rating,
        comment: comment?.trim() || null,
      },
      create: {
        researchId,
        userId: user.id,
        rating,
        comment: comment?.trim() || null,
      },
    });

    logger.info('research.feedback.submitted', {
      userId: user.id,
      metadata: { researchId, rating, feedbackId: feedback.id },
    });

    return NextResponse.json({ data: feedback });
  } catch (error) {
    logger.error('research.feedback.failed', error as Error, {
      metadata: { researchId },
    });
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createRequestLogger(request, 'api');
  const { id: researchId } = await params;

  try {
    const user = await requireAuth();
    if (isAuthError(user)) return user;

    const feedback = await prisma.researchFeedback.findUnique({
      where: {
        researchId_userId: { researchId, userId: user.id },
      },
    });

    logger.debug('research.feedback.get', {
      userId: user.id,
      metadata: { researchId, found: !!feedback },
    });

    return NextResponse.json({ data: feedback });
  } catch (error) {
    logger.error('research.feedback.get.failed', error as Error, {
      metadata: { researchId },
    });
    return NextResponse.json(
      { error: 'Failed to get feedback' },
      { status: 500 }
    );
  }
}
