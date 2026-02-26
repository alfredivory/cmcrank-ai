import { prisma } from '@/lib/db';
import type { ChatRole } from '@prisma/client';

export interface ChatHistoryItem {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

/**
 * Get chat history for a specific user and research.
 */
export async function getChatHistory(
  researchId: string,
  userId: string,
  limit: number = 50
): Promise<ChatHistoryItem[]> {
  const messages = await prisma.chatMessage.findMany({
    where: {
      researchId,
      userId,
    },
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }));
}

/**
 * Save a chat message.
 */
export async function saveChatMessage(data: {
  researchId: string;
  userId: string;
  role: ChatRole;
  content: string;
}): Promise<{ id: string }> {
  const message = await prisma.chatMessage.create({
    data: {
      researchId: data.researchId,
      userId: data.userId,
      role: data.role,
      content: data.content,
    },
    select: { id: true },
  });

  return message;
}
