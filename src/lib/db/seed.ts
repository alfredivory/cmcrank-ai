import { PrismaClient } from '@prisma/client';
import { createLogger, Logger } from '@/lib/logger';

interface SeedConfig {
  key: string;
  value: unknown;
  description: string;
}

export const SEED_CONFIGS: SeedConfig[] = [
  {
    key: 'token_scope',
    value: 1000,
    description: 'Number of tokens to track (top N by market cap)',
  },
  {
    key: 'cmc_ingestion_hour',
    value: 6,
    description: 'UTC hour for daily CMC data ingestion',
  },
];

export async function seed(
  prisma: PrismaClient,
  logger: Logger
): Promise<{ created: number; skipped: number }> {
  const startTime = Date.now();
  logger.info('seed.start', {
    metadata: { configCount: SEED_CONFIGS.length },
  });

  let created = 0;
  let skipped = 0;

  for (const config of SEED_CONFIGS) {
    const existing = await prisma.systemConfig.findUnique({
      where: { key: config.key },
    });

    if (existing) {
      logger.debug('seed.config.exists', {
        metadata: { key: config.key, currentValue: existing.value },
      });
      skipped++;
      continue;
    }

    await prisma.systemConfig.create({
      data: {
        key: config.key,
        value: config.value as never,
      },
    });

    logger.info('seed.config.created', {
      metadata: { key: config.key, value: config.value },
    });
    created++;
  }

  const durationMs = Date.now() - startTime;
  logger.info('seed.complete', {
    durationMs,
    metadata: { created, skipped },
  });

  return { created, skipped };
}

// Auto-execute when run directly
const isMainModule =
  typeof require !== 'undefined' && require.main === module;
const isDirectRun = process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js');

if (isMainModule || isDirectRun) {
  const prisma = new PrismaClient();
  const logger = createLogger('worker');

  seed(prisma, logger)
    .catch((error) => {
      logger.error('seed.failed', error as Error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
