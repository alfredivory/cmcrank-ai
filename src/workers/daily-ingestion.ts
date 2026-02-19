import { PrismaClient } from '@prisma/client';
import { CMCClient, CMCToken } from '@/lib/cmc';
import { Logger } from '@/lib/logger';

export interface IngestionResult {
  tokensProcessed: number;
  snapshotsCreated: number;
  skipped: number;
  errors: number;
  durationMs: number;
}

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function mapTokenFields(cmcToken: CMCToken) {
  return {
    cmcId: cmcToken.id,
    name: cmcToken.name,
    symbol: cmcToken.symbol,
    slug: cmcToken.slug,
    categories: cmcToken.tags.length > 0 ? cmcToken.tags : undefined,
    chain: cmcToken.platform?.name ?? null,
    launchDate: cmcToken.date_added ? new Date(cmcToken.date_added) : null,
    isTracked: true,
  };
}

export async function runDailyIngestion(
  prisma: PrismaClient,
  cmcClient: CMCClient,
  logger: Logger
): Promise<IngestionResult> {
  const startTime = Date.now();
  const today = todayUTC();

  // Read token_scope from SystemConfig
  const scopeConfig = await prisma.systemConfig.findUnique({
    where: { key: 'token_scope' },
  });
  const tokenScope = (scopeConfig?.value as number) ?? 1000;

  logger.info('ingestion.start', {
    metadata: { tokenScope, date: today.toISOString() },
  });

  // Fetch listings from CMC (1 API call)
  const response = await cmcClient.getListings(tokenScope);
  const tokens = response.data;

  let snapshotsCreated = 0;
  let skipped = 0;
  let errors = 0;

  for (const cmcToken of tokens) {
    try {
      // Upsert Token record
      const tokenData = mapTokenFields(cmcToken);
      const token = await prisma.token.upsert({
        where: { cmcId: cmcToken.id },
        update: {
          name: tokenData.name,
          symbol: tokenData.symbol,
          categories: tokenData.categories,
          chain: tokenData.chain,
          isTracked: true,
        },
        create: tokenData,
      });

      // Check for existing snapshot (dedup)
      const existingSnapshot = await prisma.dailySnapshot.findUnique({
        where: { tokenId_date: { tokenId: token.id, date: today } },
      });

      if (existingSnapshot) {
        skipped++;
        continue;
      }

      // Create daily snapshot
      await prisma.dailySnapshot.create({
        data: {
          tokenId: token.id,
          date: today,
          rank: cmcToken.cmc_rank,
          marketCap: cmcToken.quote.USD.market_cap,
          circulatingSupply: cmcToken.quote.USD.market_cap > 0 && cmcToken.quote.USD.price > 0
            ? cmcToken.circulating_supply
            : 0,
          priceUsd: cmcToken.quote.USD.price,
          volume24h: cmcToken.quote.USD.volume_24h,
        },
      });

      snapshotsCreated++;
    } catch (error) {
      errors++;
      logger.error('ingestion.token.error', error as Error, {
        metadata: { cmcId: cmcToken.id, symbol: cmcToken.symbol },
      });
    }
  }

  const durationMs = Date.now() - startTime;
  const result: IngestionResult = {
    tokensProcessed: tokens.length,
    snapshotsCreated,
    skipped,
    errors,
    durationMs,
  };

  logger.info('ingestion.complete', {
    durationMs,
    metadata: result,
  });

  return result;
}
