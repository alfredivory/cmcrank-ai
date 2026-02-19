import { prisma } from '@/lib/db';
import type { ResearchStatus } from '@prisma/client';

export interface ResearchListItem {
  id: string;
  title: string | null;
  dateRangeStart: Date;
  dateRangeEnd: Date;
  status: ResearchStatus;
  importanceScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResearchDetail {
  id: string;
  title: string | null;
  tokenId: string;
  dateRangeStart: Date;
  dateRangeEnd: Date;
  status: ResearchStatus;
  content: unknown;
  renderedMarkdown: string | null;
  importanceScore: number;
  userContext: string | null;
  parentResearchId: string | null;
  createdAt: Date;
  updatedAt: Date;
  token: {
    id: string;
    name: string;
    symbol: string;
    slug: string;
    logoUrl: string | null;
    cmcId: number;
  };
  events: {
    id: string;
    eventDate: Date;
    eventType: string;
    title: string;
    description: string | null;
    sourceUrl: string | null;
    importanceScore: number;
  }[];
}

export interface HiddenResearchContext {
  id: string;
  renderedMarkdown: string | null;
  dateRangeStart: Date;
  dateRangeEnd: Date;
}

/**
 * Find COMPLETE, visible research with >= 80% date overlap for the same token.
 * Used for deduplication. Hidden research is excluded so users can re-research.
 */
export async function findOverlappingResearch(
  tokenId: string,
  start: Date,
  end: Date
): Promise<{ id: string; dateRangeStart: Date; dateRangeEnd: Date } | null> {
  const requestedDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

  const candidates = await prisma.research.findMany({
    where: {
      tokenId,
      status: 'COMPLETE',
      isVisible: true,
      dateRangeStart: { lte: end },
      dateRangeEnd: { gte: start },
    },
    select: {
      id: true,
      dateRangeStart: true,
      dateRangeEnd: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  for (const candidate of candidates) {
    const overlapStart = Math.max(start.getTime(), candidate.dateRangeStart.getTime());
    const overlapEnd = Math.min(end.getTime(), candidate.dateRangeEnd.getTime());
    const overlapDays = Math.max(0, (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));

    if (requestedDays > 0 && overlapDays / requestedDays >= 0.8) {
      return candidate;
    }
  }

  return null;
}

/**
 * Get full research detail by ID, including token and events.
 * By default filters out hidden research. Pass includeHidden: true for admin access.
 */
export async function getResearchById(
  id: string,
  options?: { includeHidden?: boolean }
): Promise<ResearchDetail | null> {
  const where: { id: string; isVisible?: boolean } = { id };
  if (!options?.includeHidden) {
    where.isVisible = true;
  }

  const research = await prisma.research.findFirst({
    where,
    include: {
      token: {
        select: {
          id: true,
          name: true,
          symbol: true,
          slug: true,
          logoUrl: true,
          cmcId: true,
        },
      },
      events: {
        select: {
          id: true,
          eventDate: true,
          eventType: true,
          title: true,
          description: true,
          sourceUrl: true,
          importanceScore: true,
        },
        orderBy: { eventDate: 'asc' },
      },
    },
  });

  if (!research) return null;

  return {
    id: research.id,
    title: research.title,
    tokenId: research.tokenId,
    dateRangeStart: research.dateRangeStart,
    dateRangeEnd: research.dateRangeEnd,
    status: research.status,
    content: research.content,
    renderedMarkdown: research.renderedMarkdown,
    importanceScore: research.importanceScore,
    userContext: research.userContext,
    parentResearchId: research.parentResearchId,
    createdAt: research.createdAt,
    updatedAt: research.updatedAt,
    token: research.token,
    events: research.events,
  };
}

/**
 * Get paginated research list for a token.
 * By default filters out hidden research. Pass includeHidden: true for admin access.
 */
export async function getResearchForToken(
  tokenId: string,
  options: { limit: number; offset: number; includeHidden?: boolean } = { limit: 10, offset: 0 }
): Promise<{ items: ResearchListItem[]; total: number }> {
  const baseWhere: Record<string, unknown> = {
    tokenId,
    status: { in: ['COMPLETE', 'RUNNING', 'PENDING'] },
  };
  if (!options.includeHidden) {
    baseWhere.isVisible = true;
  }

  const [items, total] = await Promise.all([
    prisma.research.findMany({
      where: baseWhere,
      select: {
        id: true,
        title: true,
        dateRangeStart: true,
        dateRangeEnd: true,
        status: true,
        importanceScore: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit,
      skip: options.offset,
    }),
    prisma.research.count({
      where: baseWhere,
    }),
  ]);

  return { items, total };
}

/**
 * Lightweight status check for polling.
 * No visibility filter — users who triggered research need polling regardless.
 */
export async function getResearchStatus(
  id: string
): Promise<{ id: string; status: ResearchStatus; importanceScore: number; updatedAt: Date } | null> {
  return prisma.research.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      importanceScore: true,
      updatedAt: true,
    },
  });
}

/**
 * Find hidden COMPLETE research with overlapping date ranges for context reuse.
 * Returns up to 3 records, newest first.
 */
export async function findHiddenResearchForContext(
  tokenId: string,
  start: Date,
  end: Date
): Promise<HiddenResearchContext[]> {
  return prisma.research.findMany({
    where: {
      tokenId,
      status: 'COMPLETE',
      isVisible: false,
      dateRangeStart: { lte: end },
      dateRangeEnd: { gte: start },
    },
    select: {
      id: true,
      renderedMarkdown: true,
      dateRangeStart: true,
      dateRangeEnd: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });
}
