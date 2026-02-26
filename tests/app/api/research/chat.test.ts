import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockRequireAuth,
  mockResearchFindUnique,
  mockGetChatHistory,
  mockSaveChatMessage,
  mockGetComments,
  mockChatClient,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockResearchFindUnique: vi.fn(),
  mockGetChatHistory: vi.fn(),
  mockSaveChatMessage: vi.fn(),
  mockGetComments: vi.fn(),
  mockChatClient: { chat: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  createRequestLogger: () => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  }),
}));

vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: () => mockRequireAuth(),
  isAuthError: (r: unknown) => r instanceof Response,
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    research: { findUnique: (...args: unknown[]) => mockResearchFindUnique(...args) },
  },
}));

vi.mock('@/lib/queries/chat', () => ({
  getChatHistory: (...args: unknown[]) => mockGetChatHistory(...args),
  saveChatMessage: (...args: unknown[]) => mockSaveChatMessage(...args),
}));

vi.mock('@/lib/queries/comments', () => ({
  getCommentsForResearch: (...args: unknown[]) => mockGetComments(...args),
}));

vi.mock('@/lib/ai/chat-client', () => ({
  getAnthropicChatClient: () => mockChatClient,
}));

vi.mock('@/lib/sanitize', () => ({
  sanitizeUserContext: (s: string) => s.trim(),
}));

import { GET, POST } from '@/app/api/research/[id]/chat/route';

const allowlistedUser = {
  id: 'user1', role: 'USER', isAllowlisted: true,
  name: 'Test', email: 'test@test.com', image: null, creditsRemaining: 5, dailyCreditLimit: 10,
};

const params = Promise.resolve({ id: 'res1' });

function makeGetReq() {
  return new Request('http://localhost/api/research/res1/chat');
}

function makePostReq(body: Record<string, unknown>) {
  return new Request('http://localhost/api/research/res1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/research/[id]/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue(allowlistedUser);
    mockGetChatHistory.mockResolvedValue([]);
  });

  it('returns chat history', async () => {
    const res = await GET(makeGetReq(), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    );
    const res = await GET(makeGetReq(), { params });
    expect(res.status).toBe(401);
  });

  it('returns 403 when not allowlisted', async () => {
    mockRequireAuth.mockResolvedValue({ ...allowlistedUser, isAllowlisted: false });
    const res = await GET(makeGetReq(), { params });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/research/[id]/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue(allowlistedUser);
    mockResearchFindUnique.mockResolvedValue({
      id: 'res1',
      status: 'COMPLETE',
      version: 1,
      renderedMarkdown: 'Test content',
      content: null,
      dateRangeStart: new Date('2024-01-01'),
      dateRangeEnd: new Date('2024-01-31'),
      token: { name: 'Bitcoin', symbol: 'BTC' },
    });
    mockGetChatHistory.mockResolvedValue([]);
    mockGetComments.mockResolvedValue([]);
    mockChatClient.chat.mockResolvedValue({
      content: 'AI response here',
      suggestsReresearch: false,
    });
    mockSaveChatMessage.mockResolvedValueOnce({ id: 'um1' }).mockResolvedValueOnce({ id: 'am1' });
  });

  it('returns user and assistant messages on success', async () => {
    const res = await POST(makePostReq({ message: 'What happened?' }), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.userMessage.content).toBe('What happened?');
    expect(body.data.assistantMessage.content).toBe('AI response here');
    expect(body.data.suggestsReresearch).toBe(false);
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    );
    const res = await POST(makePostReq({ message: 'test' }), { params });
    expect(res.status).toBe(401);
  });

  it('returns 403 when not allowlisted', async () => {
    mockRequireAuth.mockResolvedValue({ ...allowlistedUser, isAllowlisted: false });
    const res = await POST(makePostReq({ message: 'test' }), { params });
    expect(res.status).toBe(403);
  });

  it('returns 400 for empty message', async () => {
    const res = await POST(makePostReq({ message: '' }), { params });
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-string message', async () => {
    const res = await POST(makePostReq({ message: 123 }), { params });
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent research', async () => {
    mockResearchFindUnique.mockResolvedValue(null);
    const res = await POST(makePostReq({ message: 'test' }), { params });
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-COMPLETE research', async () => {
    mockResearchFindUnique.mockResolvedValue({
      id: 'res1', status: 'RUNNING', version: 1,
      token: { name: 'Bitcoin', symbol: 'BTC' },
    });
    const res = await POST(makePostReq({ message: 'test' }), { params });
    expect(res.status).toBe(404);
  });

  it('saves both messages to database', async () => {
    await POST(makePostReq({ message: 'Question?' }), { params });
    expect(mockSaveChatMessage).toHaveBeenCalledTimes(2);
  });
});
