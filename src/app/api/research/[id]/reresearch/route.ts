export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { requireAuth, isAuthError } from '@/lib/auth/helpers';
import { prisma } from '@/lib/db';
import { executeReresearch } from '@/lib/ai/reresearch';

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
        { error: 'Research access required' },
        { status: 403 }
      );
    }

    // Verify original research exists and is COMPLETE
    const original = await prisma.research.findUnique({
      where: { id: researchId },
      select: { id: true, status: true, tokenId: true },
    });

    if (!original) {
      return NextResponse.json({ error: 'Research not found' }, { status: 404 });
    }

    if (original.status !== 'COMPLETE') {
      return NextResponse.json(
        { error: 'Can only re-research completed research' },
        { status: 400 }
      );
    }

    // Check for already-pending re-research
    const pendingReresearch = await prisma.research.findFirst({
      where: {
        parentResearchId: researchId,
        status: { in: ['PENDING', 'RUNNING'] },
      },
      select: { id: true },
    });

    if (pendingReresearch) {
      return NextResponse.json(
        { error: 'A re-research is already in progress', existingId: pendingReresearch.id },
        { status: 409 }
      );
    }

    const result = await executeReresearch(researchId, user.id);

    logger.info('research.reresearch.triggered', {
      userId: user.id,
      metadata: {
        originalResearchId: researchId,
        newResearchId: result.researchId,
      },
    });

    return NextResponse.json(
      { data: { researchId: result.researchId, status: 'PENDING' } },
      { status: 201 }
    );
  } catch (error) {
    logger.error('research.reresearch.failed', error as Error, {
      metadata: { researchId },
    });
    return NextResponse.json(
      { error: 'Failed to trigger re-research' },
      { status: 500 }
    );
  }
}
