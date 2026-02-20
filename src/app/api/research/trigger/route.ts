export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { requireAuth, isAuthError } from '@/lib/auth/helpers';
import { consumeCredit } from '@/lib/auth/credits';
import { prisma } from '@/lib/db';
import { sanitizeUserContext, validateDateRange } from '@/lib/sanitize';
import { findOverlappingResearch } from '@/lib/queries/research';
import { executeResearch } from '@/lib/ai/execute';

export async function POST(request: Request) {
  const logger = createRequestLogger(request, 'api');
  const startTime = Date.now();

  try {
    // Auth: require authenticated + allowlisted user
    const user = await requireAuth();
    if (isAuthError(user)) return user;

    if (!user.isAllowlisted) {
      logger.warn('research.trigger.not_allowlisted', {
        userId: user.id,
      });
      return NextResponse.json({ error: 'Research access required' }, { status: 403 });
    }

    const body = await request.json();
    const { tokenId, startDate, endDate, userContext, parentResearchId } = body;

    // Validate required fields
    if (!tokenId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'tokenId, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateValidation = validateDateRange(start, end);
    if (!dateValidation.valid) {
      return NextResponse.json({ error: dateValidation.error }, { status: 400 });
    }

    // Verify token exists
    const token = await prisma.token.findUnique({ where: { id: tokenId } });
    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    // Check for duplicate/overlapping research
    const existing = await findOverlappingResearch(tokenId, start, end);
    if (existing && !parentResearchId) {
      logger.info('research.trigger.dedup', {
        durationMs: Date.now() - startTime,
        userId: user.id,
        tokenId,
        metadata: { existingResearchId: existing.id },
      });
      return NextResponse.json({
        data: {
          researchId: existing.id,
          status: 'EXISTING',
          existingResearchId: existing.id,
        },
      });
    }

    // Consume a credit
    const creditResult = await consumeCredit(user.id);
    if (!creditResult.success) {
      logger.warn('research.trigger.no_credits', {
        userId: user.id,
        metadata: { remaining: creditResult.remaining },
      });
      return NextResponse.json(
        { error: 'No research credits remaining. Credits reset every 24 hours.' },
        { status: 429 }
      );
    }

    // Sanitize user context
    const sanitizedContext = userContext ? sanitizeUserContext(userContext) : null;

    // Create PENDING research record
    const research = await prisma.research.create({
      data: {
        tokenId,
        dateRangeStart: start,
        dateRangeEnd: end,
        triggeredByUserId: user.id,
        userContext: sanitizedContext,
        status: 'PENDING',
        parentResearchId: parentResearchId || null,
      },
    });

    logger.info('research.trigger.created', {
      durationMs: Date.now() - startTime,
      userId: user.id,
      tokenId,
      metadata: {
        researchId: research.id,
        dateRange: `${startDate} to ${endDate}`,
        hasUserContext: !!sanitizedContext,
        creditsRemaining: creditResult.remaining,
      },
    });

    // Fire and forget
    void executeResearch(research.id).catch((error) => {
      logger.error('research.trigger.execution_error', error as Error, {
        metadata: { researchId: research.id },
      });
    });

    return NextResponse.json(
      { data: { researchId: research.id, status: 'PENDING' } },
      { status: 201 }
    );
  } catch (error) {
    logger.error('research.trigger.failed', error as Error, {
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: 'Failed to trigger research' },
      { status: 500 }
    );
  }
}
