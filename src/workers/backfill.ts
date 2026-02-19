import { PrismaClient, BackfillStatus } from '@prisma/client';
import { CMCClient } from '@/lib/cmc';
import { Logger } from '@/lib/logger';

export interface BackfillResult {
  jobId: string;
  status: BackfillStatus;
  tokensProcessed: number;
  snapshotsCreated: number;
  errors: number;
  durationMs: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runBackfill(
  jobId: string,
  prisma: PrismaClient,
  cmcClient: CMCClient,
  logger: Logger,
  rateLimitMs: number = 2100
): Promise<BackfillResult> {
  const startTime = Date.now();

  // Load job
  const job = await prisma.backfillJob.findUniqueOrThrow({
    where: { id: jobId },
  });

  logger.info('backfill.start', {
    metadata: {
      jobId,
      dateRangeStart: job.dateRangeStart.toISOString(),
      dateRangeEnd: job.dateRangeEnd.toISOString(),
      tokenScope: job.tokenScope,
      resumeFromCmcId: job.lastProcessedCmcId,
    },
  });

  // Update status to RUNNING
  await prisma.backfillJob.update({
    where: { id: jobId },
    data: { status: 'RUNNING', startedAt: new Date() },
  });

  // Fetch tracked tokens ordered by cmcId
  const tokens = await prisma.token.findMany({
    where: { isTracked: true },
    orderBy: { cmcId: 'asc' },
    take: job.tokenScope,
    select: { id: true, cmcId: true, symbol: true },
  });

  // Resume support: skip already-processed tokens
  let tokensToProcess = tokens;
  if (job.lastProcessedCmcId) {
    const resumeIndex = tokens.findIndex((t) => t.cmcId === job.lastProcessedCmcId);
    if (resumeIndex >= 0) {
      tokensToProcess = tokens.slice(resumeIndex + 1);
      logger.info('backfill.resuming', {
        metadata: {
          lastProcessedCmcId: job.lastProcessedCmcId,
          skippedTokens: resumeIndex + 1,
          remainingTokens: tokensToProcess.length,
        },
      });
    }
  }

  let tokensProcessed = job.tokensProcessed;
  let snapshotsCreated = 0;
  let errorCount = 0;
  const errorMessages: string[] = [];

  for (const token of tokensToProcess) {
    // Check if job was paused
    const currentJob = await prisma.backfillJob.findUniqueOrThrow({
      where: { id: jobId },
    });
    if (currentJob.status === 'PAUSED') {
      logger.info('backfill.paused', {
        metadata: { jobId, tokensProcessed, lastCmcId: token.cmcId },
      });
      return {
        jobId,
        status: 'PAUSED',
        tokensProcessed,
        snapshotsCreated,
        errors: errorCount,
        durationMs: Date.now() - startTime,
      };
    }

    try {
      logger.debug('backfill.token.start', {
        metadata: { cmcId: token.cmcId, symbol: token.symbol },
      });

      // Fetch historical quotes for full date range
      const quotes = await cmcClient.getHistoricalQuotes(
        token.cmcId,
        job.dateRangeStart,
        job.dateRangeEnd
      );

      // Upsert daily snapshots
      for (const quote of quotes) {
        const quoteDate = new Date(quote.timestamp);
        const dateOnly = new Date(
          Date.UTC(quoteDate.getUTCFullYear(), quoteDate.getUTCMonth(), quoteDate.getUTCDate())
        );

        await prisma.dailySnapshot.upsert({
          where: { tokenId_date: { tokenId: token.id, date: dateOnly } },
          update: {
            marketCap: quote.quote.USD.market_cap,
            circulatingSupply: quote.quote.USD.circulating_supply,
            priceUsd: quote.quote.USD.price,
            volume24h: quote.quote.USD.volume_24h,
          },
          create: {
            tokenId: token.id,
            date: dateOnly,
            rank: 0, // Will be computed after all tokens are processed
            marketCap: quote.quote.USD.market_cap,
            circulatingSupply: quote.quote.USD.circulating_supply,
            priceUsd: quote.quote.USD.price,
            volume24h: quote.quote.USD.volume_24h,
          },
        });
        snapshotsCreated++;
      }

      tokensProcessed++;

      // Update progress
      await prisma.backfillJob.update({
        where: { id: jobId },
        data: {
          tokensProcessed,
          lastProcessedCmcId: token.cmcId,
        },
      });

      logger.debug('backfill.token.complete', {
        metadata: {
          cmcId: token.cmcId,
          symbol: token.symbol,
          quotesCount: quotes.length,
        },
      });

      // Rate limit
      if (rateLimitMs > 0) {
        await sleep(rateLimitMs);
      }
    } catch (error) {
      errorCount++;
      const errorMsg = `Token ${token.symbol} (cmcId: ${token.cmcId}): ${(error as Error).message}`;
      errorMessages.push(errorMsg);

      logger.error('backfill.token.error', error as Error, {
        metadata: { cmcId: token.cmcId, symbol: token.symbol },
      });

      // Update progress even on error so we skip this token on resume
      tokensProcessed++;
      await prisma.backfillJob.update({
        where: { id: jobId },
        data: {
          tokensProcessed,
          lastProcessedCmcId: token.cmcId,
          errors: errorMessages,
        },
      });

      // Rate limit even after errors
      if (rateLimitMs > 0) {
        await sleep(rateLimitMs);
      }
    }
  }

  // Compute ranks for all dates in the range
  logger.info('backfill.computing_ranks', {
    metadata: { jobId },
  });

  await computeRanks(prisma, job.dateRangeStart, job.dateRangeEnd, logger);

  // Determine final status
  const totalTokens = tokens.length;
  const failureRate = totalTokens > 0 ? errorCount / totalTokens : 0;
  const finalStatus: BackfillStatus = failureRate > 0.5 ? 'FAILED' : 'COMPLETE';

  await prisma.backfillJob.update({
    where: { id: jobId },
    data: {
      status: finalStatus,
      completedAt: new Date(),
      tokensProcessed,
      errors: errorMessages.length > 0 ? errorMessages : undefined,
    },
  });

  const durationMs = Date.now() - startTime;
  logger.info('backfill.complete', {
    durationMs,
    metadata: {
      jobId,
      status: finalStatus,
      tokensProcessed,
      snapshotsCreated,
      errors: errorCount,
    },
  });

  return {
    jobId,
    status: finalStatus,
    tokensProcessed,
    snapshotsCreated,
    errors: errorCount,
    durationMs,
  };
}

export async function computeRanks(
  prisma: PrismaClient,
  dateRangeStart: Date,
  dateRangeEnd: Date,
  logger: Logger
): Promise<number> {
  // Get all unique dates that have snapshots in the range
  const dates = await prisma.dailySnapshot.findMany({
    where: {
      date: { gte: dateRangeStart, lte: dateRangeEnd },
    },
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'asc' },
  });

  logger.info('backfill.ranks.start', {
    metadata: { dateCount: dates.length },
  });

  let rankedDates = 0;

  for (const { date } of dates) {
    // Get all snapshots for this date, ordered by market cap DESC
    const snapshots = await prisma.dailySnapshot.findMany({
      where: { date },
      orderBy: { marketCap: 'desc' },
      select: { id: true },
    });

    // Assign ranks
    const updates = snapshots.map((snapshot, index) =>
      prisma.dailySnapshot.update({
        where: { id: snapshot.id },
        data: { rank: index + 1 },
      })
    );

    await prisma.$transaction(updates);
    rankedDates++;
  }

  logger.info('backfill.ranks.complete', {
    metadata: { rankedDates },
  });

  return rankedDates;
}

export async function startBackfill(
  dateRangeStart: Date,
  dateRangeEnd: Date,
  tokenScope: number,
  prisma: PrismaClient,
  cmcClient: CMCClient,
  logger: Logger
): Promise<{ jobId: string; status: string; message: string }> {
  // Check for existing job with same date range and scope
  const existing = await prisma.backfillJob.findUnique({
    where: {
      dateRangeStart_dateRangeEnd_tokenScope: {
        dateRangeStart,
        dateRangeEnd,
        tokenScope,
      },
    },
  });

  if (existing) {
    if (existing.status === 'COMPLETE') {
      logger.info('backfill.already_complete', {
        metadata: { jobId: existing.id },
      });
      return { jobId: existing.id, status: 'COMPLETE', message: 'Backfill already completed' };
    }

    if (existing.status === 'RUNNING') {
      logger.info('backfill.already_running', {
        metadata: { jobId: existing.id },
      });
      return { jobId: existing.id, status: 'RUNNING', message: 'Backfill already in progress' };
    }

    // FAILED or PAUSED — resume
    logger.info('backfill.resuming_job', {
      metadata: { jobId: existing.id, previousStatus: existing.status },
    });

    await prisma.backfillJob.update({
      where: { id: existing.id },
      data: { status: 'QUEUED' },
    });

    // Fire and forget
    runBackfill(existing.id, prisma, cmcClient, logger).catch((error) => {
      logger.error('backfill.unhandled_error', error as Error, {
        metadata: { jobId: existing.id },
      });
    });

    return { jobId: existing.id, status: 'QUEUED', message: 'Backfill resumed' };
  }

  // Create new job
  const job = await prisma.backfillJob.create({
    data: {
      dateRangeStart,
      dateRangeEnd,
      tokenScope,
      status: 'QUEUED',
    },
  });

  logger.info('backfill.job_created', {
    metadata: { jobId: job.id, dateRangeStart: dateRangeStart.toISOString(), dateRangeEnd: dateRangeEnd.toISOString(), tokenScope },
  });

  // Fire and forget
  runBackfill(job.id, prisma, cmcClient, logger).catch((error) => {
    logger.error('backfill.unhandled_error', error as Error, {
      metadata: { jobId: job.id },
    });
  });

  return { jobId: job.id, status: 'QUEUED', message: 'Backfill started' };
}

export async function pauseBackfill(
  jobId: string,
  prisma: PrismaClient,
  logger: Logger
): Promise<{ success: boolean; message: string }> {
  const job = await prisma.backfillJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    return { success: false, message: 'Job not found' };
  }

  if (job.status !== 'RUNNING') {
    return { success: false, message: `Cannot pause job with status: ${job.status}` };
  }

  await prisma.backfillJob.update({
    where: { id: jobId },
    data: { status: 'PAUSED' },
  });

  logger.info('backfill.pause_requested', {
    metadata: { jobId },
  });

  return { success: true, message: 'Pause requested — job will stop after current token' };
}
