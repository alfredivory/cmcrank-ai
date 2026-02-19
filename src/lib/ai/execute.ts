import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { getAnthropicResearchClient } from './client';
import { getSnapshotHistory } from '@/lib/queries/tokens';
import { findHiddenResearchForContext } from '@/lib/queries/research';
import type { ResearchAIResponse, ResearchRequestParams } from './types';
import type { EventType, EventSource } from '@prisma/client';

const AI_RESEARCH_SOURCE: EventSource = 'AI_RESEARCH';

/**
 * Execute a research investigation. Fire-and-forget — never throws.
 * Updates the research record in DB with results or failure status.
 */
export async function executeResearch(researchId: string): Promise<void> {
  const logger = createLogger('api');

  try {
    // 1. Load research record + token
    const research = await prisma.research.findUniqueOrThrow({
      where: { id: researchId },
      include: {
        token: true,
      },
    });

    logger.info('research.execute.start', {
      metadata: {
        researchId,
        tokenId: research.tokenId,
        tokenName: research.token.name,
        dateRange: `${research.dateRangeStart.toISOString()} to ${research.dateRangeEnd.toISOString()}`,
      },
    });

    // 2. Update status → RUNNING
    await prisma.research.update({
      where: { id: researchId },
      data: { status: 'RUNNING' },
    });

    // 3. Get snapshot history for the date range
    const snapshots = await getSnapshotHistory(
      research.tokenId,
      'all',
      research.dateRangeStart,
      research.dateRangeEnd
    );

    const rankDataPoints = snapshots.map((s) => ({
      date: s.date,
      rank: s.rank,
    }));

    // 3b. Fetch hidden research for context reuse
    const hiddenResearch = await findHiddenResearchForContext(
      research.tokenId,
      research.dateRangeStart,
      research.dateRangeEnd
    );

    let previousResearchFindings: string | undefined;
    if (hiddenResearch.length > 0) {
      previousResearchFindings = hiddenResearch
        .map((hr) => {
          const start = hr.dateRangeStart.toISOString().split('T')[0];
          const end = hr.dateRangeEnd.toISOString().split('T')[0];
          return `--- Previous research (${start} to ${end}) ---\n${hr.renderedMarkdown ?? '(no content)'}`;
        })
        .join('\n\n');

      logger.info('research.execute.context_reuse', {
        metadata: {
          researchId,
          hiddenResearchCount: hiddenResearch.length,
          contextCharLength: previousResearchFindings.length,
        },
      });
    }

    // 4. Build params and call AI
    const params: ResearchRequestParams = {
      tokenName: research.token.name,
      tokenSymbol: research.token.symbol,
      currentRank: snapshots.length > 0 ? snapshots[snapshots.length - 1].rank : 0,
      dateRangeStart: research.dateRangeStart.toISOString().split('T')[0],
      dateRangeEnd: research.dateRangeEnd.toISOString().split('T')[0],
      rankDataPoints,
      userContext: research.userContext ?? undefined,
      previousResearchFindings,
    };

    const client = getAnthropicResearchClient(logger);
    const aiResponse = await client.research(params);

    // 5. Render report
    const renderedMarkdown = renderResearchReport(
      aiResponse,
      research.token.name,
      research.dateRangeStart,
      research.dateRangeEnd
    );

    // 6. Transaction: update research + create events
    await prisma.$transaction(async (tx) => {
      await tx.research.update({
        where: { id: researchId },
        data: {
          status: 'COMPLETE',
          content: JSON.parse(JSON.stringify(aiResponse.report)),
          renderedMarkdown,
          importanceScore: aiResponse.overallImportanceScore,
        },
      });

      // Create Event records from extracted events
      if (aiResponse.events.length > 0) {
        await tx.event.createMany({
          data: aiResponse.events.map((ev) => ({
            tokenId: research.tokenId,
            eventDate: new Date(ev.date),
            eventType: ev.eventType as EventType,
            title: ev.title,
            description: ev.description || null,
            sourceUrl: ev.sourceUrl,
            source: AI_RESEARCH_SOURCE,
            researchId,
            importanceScore: ev.importanceScore,
            createdByUserId: research.triggeredByUserId,
          })),
        });
      }
    });

    logger.info('research.execute.complete', {
      metadata: {
        researchId,
        tokenName: research.token.name,
        eventsCreated: aiResponse.events.length,
        importanceScore: aiResponse.overallImportanceScore,
        sourcesCount: aiResponse.report.sources.length,
      },
    });
  } catch (error) {
    logger.error('research.execute.failed', error as Error, {
      metadata: { researchId },
    });

    // Update status to FAILED
    try {
      await prisma.research.update({
        where: { id: researchId },
        data: { status: 'FAILED' },
      });
    } catch (updateError) {
      logger.error('research.execute.status_update_failed', updateError as Error, {
        metadata: { researchId },
      });
    }
  }
}

/**
 * Render the AI response into styled markdown for display.
 */
export function renderResearchReport(
  response: ResearchAIResponse,
  tokenName: string,
  dateStart: Date,
  dateEnd: Date
): string {
  const startStr = dateStart.toISOString().split('T')[0];
  const endStr = dateEnd.toISOString().split('T')[0];

  const sections: string[] = [];

  // Header
  sections.push(`# Research: ${tokenName}`);
  sections.push(`**Period:** ${startStr} to ${endStr}`);
  sections.push('');

  // Executive Summary
  sections.push('## Executive Summary');
  sections.push(response.report.executiveSummary);
  sections.push('');

  // Findings
  for (const finding of response.report.findings) {
    sections.push(`## ${finding.title}`);
    sections.push(finding.content);
    sections.push('');
  }

  // Sources
  if (response.report.sources.length > 0) {
    sections.push('## Sources');
    for (const source of response.report.sources) {
      sections.push(`- [${source.title}](${source.url}) — ${source.domain}`);
    }
    sections.push('');
  }

  return sections.join('\n');
}
