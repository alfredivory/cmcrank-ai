import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

import CommentThread from '@/components/research/CommentThread';
import type { CommentItem } from '@/types/comments';

const baseComment: CommentItem = {
  id: 'c1',
  researchId: 'res1',
  researchVersion: 1,
  content: 'This is a test comment',
  citedText: null,
  isDeleted: false,
  createdAt: new Date().toISOString(),
  author: { id: 'u1', name: 'Alice', image: null },
  reactions: { UPVOTE: 2, DOWNVOTE: 0, FIRE: 1, LIGHTBULB: 0, THINKING: 0, HUNDRED: 0 },
  userReactions: [],
  replies: [],
  score: 10,
};

describe('CommentThread', () => {
  it('renders comment content', () => {
    render(
      <CommentThread
        comment={baseComment}
        researchId="res1"
        researchVersion={1}
        onCommentAdded={vi.fn()}
        onCommentDeleted={vi.fn()}
      />
    );
    expect(screen.getByText('This is a test comment')).toBeInTheDocument();
  });

  it('renders author name', () => {
    render(
      <CommentThread
        comment={baseComment}
        researchId="res1"
        researchVersion={1}
        onCommentAdded={vi.fn()}
        onCommentDeleted={vi.fn()}
      />
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders version badge', () => {
    render(
      <CommentThread
        comment={baseComment}
        researchId="res1"
        researchVersion={1}
        onCommentAdded={vi.fn()}
        onCommentDeleted={vi.fn()}
      />
    );
    expect(screen.getByText('v1')).toBeInTheDocument();
  });

  it('renders cited text as blockquote', () => {
    const withCitation = { ...baseComment, citedText: 'The ETF drove interest' };
    render(
      <CommentThread
        comment={withCitation}
        researchId="res1"
        researchVersion={1}
        onCommentAdded={vi.fn()}
        onCommentDeleted={vi.fn()}
      />
    );
    expect(screen.getByText('The ETF drove interest')).toBeInTheDocument();
  });

  it('shows [deleted] for deleted comments', () => {
    const deleted = {
      ...baseComment,
      isDeleted: true,
      content: '[deleted]',
      author: { ...baseComment.author, name: null, image: null },
    };
    render(
      <CommentThread
        comment={deleted}
        researchId="res1"
        researchVersion={1}
        onCommentAdded={vi.fn()}
        onCommentDeleted={vi.fn()}
      />
    );
    expect(screen.getByText('[deleted]')).toBeInTheDocument();
    expect(screen.getByText('Deleted')).toBeInTheDocument();
  });

  it('renders nested replies', () => {
    const reply: CommentItem = {
      ...baseComment,
      id: 'c2',
      content: 'Reply content',
      author: { id: 'u2', name: 'Bob', image: null },
      replies: [],
    };
    const commentWithReply = { ...baseComment, replies: [reply] };
    render(
      <CommentThread
        comment={commentWithReply}
        researchId="res1"
        researchVersion={1}
        onCommentAdded={vi.fn()}
        onCommentDeleted={vi.fn()}
      />
    );
    expect(screen.getByText('Reply content')).toBeInTheDocument();
  });

  it('shows Reply button when depth < 2 and user is logged in', () => {
    render(
      <CommentThread
        comment={baseComment}
        researchId="res1"
        researchVersion={1}
        currentUserId="u2"
        onCommentAdded={vi.fn()}
        onCommentDeleted={vi.fn()}
      />
    );
    expect(screen.getByText('Reply')).toBeInTheDocument();
  });

  it('shows Delete button for comment author', () => {
    render(
      <CommentThread
        comment={baseComment}
        researchId="res1"
        researchVersion={1}
        currentUserId="u1"
        onCommentAdded={vi.fn()}
        onCommentDeleted={vi.fn()}
      />
    );
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('does not show Delete button for non-author', () => {
    render(
      <CommentThread
        comment={baseComment}
        researchId="res1"
        researchVersion={1}
        currentUserId="u2"
        onCommentAdded={vi.fn()}
        onCommentDeleted={vi.fn()}
      />
    );
    expect(screen.queryByText('Delete')).toBeNull();
  });
});
