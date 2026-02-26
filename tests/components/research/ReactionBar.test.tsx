import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockFetch = vi.fn();
global.fetch = mockFetch;

import ReactionBar from '@/components/research/ReactionBar';
import type { ReactionCounts } from '@/types/comments';

const emptyReactions: ReactionCounts = {
  UPVOTE: 0, DOWNVOTE: 0, FIRE: 0, LIGHTBULB: 0, THINKING: 0, HUNDRED: 0,
};

describe('ReactionBar', () => {
  it('renders upvote and downvote buttons', () => {
    render(
      <ReactionBar
        commentId="c1"
        researchId="res1"
        reactions={emptyReactions}
        userReactions={[]}
      />
    );
    expect(screen.getByLabelText('Upvote')).toBeInTheDocument();
    expect(screen.getByLabelText('Downvote')).toBeInTheDocument();
  });

  it('displays vote score', () => {
    const reactions = { ...emptyReactions, UPVOTE: 5, DOWNVOTE: 2 };
    render(
      <ReactionBar
        commentId="c1"
        researchId="res1"
        reactions={reactions}
        userReactions={[]}
      />
    );
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('highlights active user reactions', () => {
    const reactions = { ...emptyReactions, UPVOTE: 1 };
    render(
      <ReactionBar
        commentId="c1"
        researchId="res1"
        reactions={reactions}
        userReactions={['UPVOTE']}
      />
    );
    const upvoteBtn = screen.getByLabelText('Upvote');
    expect(upvoteBtn.className).toContain('text-green-400');
    // Downvote should NOT be highlighted (not have bg-red-900/30 active state)
    const downvoteBtn = screen.getByLabelText('Downvote');
    expect(downvoteBtn.className).not.toContain('bg-red-900/30');
  });

  it('shows emoji reactions with counts', () => {
    const reactions = { ...emptyReactions, FIRE: 3 };
    render(
      <ReactionBar
        commentId="c1"
        researchId="res1"
        reactions={reactions}
        userReactions={[]}
      />
    );
    expect(screen.getByLabelText('Fire')).toBeInTheDocument();
  });

  it('calls API on reaction click', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => ({ data: { added: true } }) });

    render(
      <ReactionBar
        commentId="c1"
        researchId="res1"
        reactions={emptyReactions}
        userReactions={[]}
      />
    );

    fireEvent.click(screen.getByLabelText('Upvote'));

    // Wait for the async handler
    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/research/res1/comments/c1/reactions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ type: 'UPVOTE' }),
        })
      );
    });
  });
});
