import type { ReactionType } from '@prisma/client';

export interface CommentAuthor {
  id: string;
  name: string | null;
  image: string | null;
}

export interface ReactionCounts {
  UPVOTE: number;
  DOWNVOTE: number;
  FIRE: number;
  LIGHTBULB: number;
  THINKING: number;
  HUNDRED: number;
}

export interface CommentItem {
  id: string;
  researchId: string;
  researchVersion: number;
  content: string;
  citedText: string | null;
  isDeleted: boolean;
  createdAt: string;
  author: CommentAuthor;
  reactions: ReactionCounts;
  userReactions: ReactionType[];
  replies: CommentItem[];
  score: number;
}
