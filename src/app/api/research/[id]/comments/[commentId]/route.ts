export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { requireAuth, isAuthError } from '@/lib/auth/helpers';
import { softDeleteComment } from '@/lib/queries/comments';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const logger = createRequestLogger(request, 'api');
  const { id: researchId, commentId } = await params;

  try {
    const user = await requireAuth();
    if (isAuthError(user)) return user;

    const isAdmin = user.role === 'ADMIN';
    const deleted = await softDeleteComment(commentId, user.id, isAdmin);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Comment not found or not authorized' },
        { status: 404 }
      );
    }

    logger.info('research.comments.deleted', {
      userId: user.id,
      metadata: { researchId, commentId },
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    logger.error('research.comments.delete.failed', error as Error, {
      metadata: { researchId, commentId },
    });
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
