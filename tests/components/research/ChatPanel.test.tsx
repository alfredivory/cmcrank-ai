import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'u1', name: 'Test', isAllowlisted: true } },
    status: 'authenticated',
  }),
}));

vi.mock('@/components/auth/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import ChatPanel from '@/components/research/ChatPanel';

const emptyResponse = {
  ok: true,
  json: () => Promise.resolve({ data: [] }),
};

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(emptyResponse);
  });

  it('does not render when closed', () => {
    const { container } = render(
      <ChatPanel researchId="res1" isOpen={false} onClose={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders header when open', () => {
    render(<ChatPanel researchId="res1" isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Chat with Research')).toBeInTheDocument();
  });

  it('loads and displays chat history', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { id: 'm1', role: 'USER', content: 'Hello', createdAt: new Date().toISOString() },
          { id: 'm2', role: 'ASSISTANT', content: 'Hi there!', createdAt: new Date().toISOString() },
        ],
      }),
    });

    render(<ChatPanel researchId="res1" isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });
  });

  it('shows empty state when no messages', async () => {
    render(<ChatPanel researchId="res1" isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Ask questions about this research/)).toBeInTheDocument();
    });
  });

  it('has close button', () => {
    render(<ChatPanel researchId="res1" isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByLabelText('Close chat')).toBeInTheDocument();
  });

  it('renders send button', () => {
    render(<ChatPanel researchId="res1" isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByLabelText('Send message')).toBeInTheDocument();
  });
});
