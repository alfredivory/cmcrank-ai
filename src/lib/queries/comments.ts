import { prisma } from '@/lib/db';
import type { ReactionType } from '@prisma/client';
import type { CommentItem, ReactionCounts } from '@/types/comments';

const EMPTY_REACTIONS: ReactionCounts = {
  UPVOTE: 0,
  DOWNVOTE: 0,
  FIRE: 0,
  LIGHTBULB: 0,
  THINKING: 0,
  HUNDRED: 0,
};

const VOTE_TYPES: ReactionType[] = ['UPVOTE', 'DOWNVOTE'];

/**
 * Compute ranking score for a comment.
 * Higher = shown first.
 */
export function computeCommentScore(
  researchVersion: number,
  currentVersion: number,
  upvotes: number,
  downvotes: number,
  isViewerAuthor: boolean
): number {
  const versionDistance = Math.abs(currentVersion - researchVersion);
  const recency = 10 / (1 + versionDistance);
  const reactions = (upvotes - downvotes) * 0.5;
  const authorBoost = isViewerAuthor ? 2 : 0;
  return recency + reactions + authorBoost;
}

/**
 * Fetch all comments for a research, build ranked tree.
 */
export async function getCommentsForResearch(
  researchId: string,
  currentVersion: number,
  currentUserId?: string
): Promise<CommentItem[]> {
  const comments = await prisma.researchComment.findMany({
    where: { researchId },
    include: {
      user: {
        select: { id: true, name: true, image: true },
      },
      reactions: {
        select: { type: true, userId: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Build flat map
  const commentMap = new Map<string, CommentItem>();
  const roots: CommentItem[] = [];

  for (const c of comments) {
    const reactionCounts: ReactionCounts = { ...EMPTY_REACTIONS };
    const userReactions: ReactionType[] = [];

    for (const r of c.reactions) {
      reactionCounts[r.type]++;
      if (currentUserId && r.userId === currentUserId) {
        userReactions.push(r.type);
      }
    }

    const isViewerAuthor = currentUserId ? c.userId === currentUserId : false;
    const score = computeCommentScore(
      c.researchVersion,
      currentVersion,
      reactionCounts.UPVOTE,
      reactionCounts.DOWNVOTE,
      isViewerAuthor
    );

    const item: CommentItem = {
      id: c.id,
      researchId: c.researchId,
      researchVersion: c.researchVersion,
      content: c.isDeleted ? '[deleted]' : c.content,
      citedText: c.isDeleted ? null : c.citedText,
      isDeleted: c.isDeleted,
      createdAt: c.createdAt.toISOString(),
      author: {
        id: c.user.id,
        name: c.isDeleted ? null : c.user.name,
        image: c.isDeleted ? null : c.user.image,
      },
      reactions: reactionCounts,
      userReactions,
      replies: [],
      score,
    };

    commentMap.set(c.id, item);

    if (!c.parentCommentId) {
      roots.push(item);
    }
  }

  // Attach children to parents
  for (const c of comments) {
    if (c.parentCommentId) {
      const parent = commentMap.get(c.parentCommentId);
      const child = commentMap.get(c.id);
      if (parent && child) {
        parent.replies.push(child);
      }
    }
  }

  // Sort by score descending
  const sortByScore = (items: CommentItem[]): void => {
    items.sort((a, b) => b.score - a.score);
    for (const item of items) {
      sortByScore(item.replies);
    }
  };
  sortByScore(roots);

  return roots;
}

/**
 * Create a new comment on a research.
 */
export async function createComment(data: {
  researchId: string;
  userId: string;
  researchVersion: number;
  content: string;
  citedText?: string;
  parentCommentId?: string;
}): Promise<{ id: string }> {
  // If replying, enforce max depth of 2
  if (data.parentCommentId) {
    const parent = await prisma.researchComment.findUnique({
      where: { id: data.parentCommentId },
      select: { parentCommentId: true },
    });
    if (parent?.parentCommentId) {
      throw new Error('Maximum reply depth exceeded');
    }
  }

  const comment = await prisma.researchComment.create({
    data: {
      researchId: data.researchId,
      userId: data.userId,
      researchVersion: data.researchVersion,
      content: data.content,
      citedText: data.citedText ?? null,
      parentCommentId: data.parentCommentId ?? null,
    },
    select: { id: true },
  });

  return comment;
}

/**
 * Soft-delete a comment. Only the author or an admin can delete.
 */
export async function softDeleteComment(
  commentId: string,
  userId: string,
  isAdmin: boolean
): Promise<boolean> {
  const comment = await prisma.researchComment.findUnique({
    where: { id: commentId },
    select: { userId: true, isDeleted: true },
  });

  if (!comment || comment.isDeleted) return false;
  if (comment.userId !== userId && !isAdmin) return false;

  await prisma.researchComment.update({
    where: { id: commentId },
    data: { isDeleted: true },
  });

  return true;
}

/**
 * Toggle a reaction on a comment.
 * UPVOTE/DOWNVOTE are mutually exclusive — adding one removes the other.
 * Returns true if the reaction was added, false if removed.
 */
export async function toggleReaction(
  commentId: string,
  userId: string,
  type: ReactionType
): Promise<boolean> {
  const existing = await prisma.commentReaction.findUnique({
    where: {
      commentId_userId_type: { commentId, userId, type },
    },
  });

  if (existing) {
    await prisma.commentReaction.delete({
      where: { id: existing.id },
    });
    return false;
  }

  // If adding UPVOTE, remove DOWNVOTE (and vice versa)
  if (VOTE_TYPES.includes(type)) {
    const opposite: ReactionType = type === 'UPVOTE' ? 'DOWNVOTE' : 'UPVOTE';
    await prisma.commentReaction.deleteMany({
      where: { commentId, userId, type: opposite },
    });
  }

  await prisma.commentReaction.create({
    data: { commentId, userId, type },
  });

  return true;
}
