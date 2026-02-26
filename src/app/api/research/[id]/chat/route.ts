export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { requireAuth, isAuthError } from '@/lib/auth/helpers';
import { prisma } from '@/lib/db';
import { sanitizeUserContext } from '@/lib/sanitize';
import { getChatHistory, saveChatMessage } from '@/lib/queries/chat';
import { getCommentsForResearch } from '@/lib/queries/comments';
import { getAnthropicChatClient } from '@/lib/ai/chat-client';

export async function GET(
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

    const history = await getChatHistory(researchId, user.id);

    logger.debug('research.chat.history', {
      userId: user.id,
      metadata: { researchId, messageCount: history.length },
    });

    return NextResponse.json({ data: history });
  } catch (error) {
    logger.error('research.chat.history.failed', error as Error, {
      metadata: { researchId },
    });
    return NextResponse.json(
      { error: 'Failed to load chat history' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createRequestLogger(request, 'api');
  const { id: researchId } = await params;
  const startTime = Date.now();

  try {
    const user = await requireAuth();
    if (isAuthError(user)) return user;

    if (!user.isAllowlisted) {
      return NextResponse.json(
        { error: 'Research access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const sanitizedMessage = sanitizeUserContext(message);

    // Load research with token info
    const research = await prisma.research.findUnique({
      where: { id: researchId },
      include: {
        token: { select: { name: true, symbol: true } },
      },
    });

    if (!research || research.status !== 'COMPLETE') {
      return NextResponse.json(
        { error: 'Research not found or not complete' },
        { status: 404 }
      );
    }

    // Load chat history for context
    const history = await getChatHistory(researchId, user.id);
    const historyMessages = history.map((h) => ({
      role: h.role === 'USER' ? 'user' as const : 'assistant' as const,
      content: h.content,
    }));

    // Load comments for context
    const comments = await getCommentsForResearch(researchId, research.version);

    // Call AI
    const client = getAnthropicChatClient(logger);
    const aiResponse = await client.chat(
      sanitizedMessage,
      {
        tokenName: research.token.name,
        tokenSymbol: research.token.symbol,
        researchVersion: research.version,
        dateRangeStart: research.dateRangeStart.toISOString().split('T')[0],
        dateRangeEnd: research.dateRangeEnd.toISOString().split('T')[0],
        researchContent: research.renderedMarkdown || JSON.stringify(research.content),
        comments,
      },
      historyMessages
    );

    // Save both messages
    const [userMsg, assistantMsg] = await Promise.all([
      saveChatMessage({
        researchId,
        userId: user.id,
        role: 'USER',
        content: sanitizedMessage,
      }),
      saveChatMessage({
        researchId,
        userId: user.id,
        role: 'ASSISTANT',
        content: aiResponse.content,
      }),
    ]);

    logger.info('research.chat.message', {
      userId: user.id,
      durationMs: Date.now() - startTime,
      metadata: {
        researchId,
        userMessageId: userMsg.id,
        assistantMessageId: assistantMsg.id,
        suggestsReresearch: aiResponse.suggestsReresearch,
      },
    });

    return NextResponse.json({
      data: {
        userMessage: {
          id: userMsg.id,
          role: 'USER',
          content: sanitizedMessage,
          createdAt: new Date().toISOString(),
        },
        assistantMessage: {
          id: assistantMsg.id,
          role: 'ASSISTANT',
          content: aiResponse.content,
          createdAt: new Date().toISOString(),
        },
        suggestsReresearch: aiResponse.suggestsReresearch,
      },
    });
  } catch (error) {
    logger.error('research.chat.failed', error as Error, {
      durationMs: Date.now() - startTime,
      metadata: { researchId },
    });
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
