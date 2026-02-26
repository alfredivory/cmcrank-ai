import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'u1', name: 'Test' } }, status: 'authenticated' }),
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

vi.mock('@/components/auth/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import CommentSection from '@/components/research/CommentSection';

describe('CommentSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner then comments', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: [
          {
            id: 'c1',
            researchId: 'res1',
            researchVersion: 1,
            content: 'Test comment',
            citedText: null,
            isDeleted: false,
            createdAt: new Date().toISOString(),
            author: { id: 'u2', name: 'Alice', image: null },
            reactions: { UPVOTE: 0, DOWNVOTE: 0, FIRE: 0, LIGHTBULB: 0, THINKING: 0, HUNDRED: 0 },
            userReactions: [],
            replies: [],
            score: 10,
          },
        ],
      }),
    });

    render(<CommentSection researchId="res1" researchVersion={1} />);

    await waitFor(() => {
      expect(screen.getByText('Test comment')).toBeInTheDocument();
    });
  });

  it('shows empty state when no comments', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    render(<CommentSection researchId="res1" researchVersion={1} />);

    await waitFor(() => {
      expect(screen.getByText(/No comments yet/)).toBeInTheDocument();
    });
  });

  it('renders comment count in header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: [
          {
            id: 'c1', researchId: 'res1', researchVersion: 1, content: 'One',
            citedText: null, isDeleted: false, createdAt: new Date().toISOString(),
            author: { id: 'u2', name: 'Alice', image: null },
            reactions: { UPVOTE: 0, DOWNVOTE: 0, FIRE: 0, LIGHTBULB: 0, THINKING: 0, HUNDRED: 0 },
            userReactions: [], replies: [], score: 10,
          },
          {
            id: 'c2', researchId: 'res1', researchVersion: 1, content: 'Two',
            citedText: null, isDeleted: false, createdAt: new Date().toISOString(),
            author: { id: 'u3', name: 'Bob', image: null },
            reactions: { UPVOTE: 0, DOWNVOTE: 0, FIRE: 0, LIGHTBULB: 0, THINKING: 0, HUNDRED: 0 },
            userReactions: [], replies: [], score: 5,
          },
        ],
      }),
    });

    render(<CommentSection researchId="res1" researchVersion={1} />);

    await waitFor(() => {
      expect(screen.getByText(/Comments \(2\)/)).toBeInTheDocument();
    });
  });

  it('renders cited text if provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    render(
      <CommentSection
        researchId="res1"
        researchVersion={1}
        citedText="Important finding here"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Important finding here/)).toBeInTheDocument();
    });
  });
});
