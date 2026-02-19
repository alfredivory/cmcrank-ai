import { describe, it, expect, vi, beforeEach } from 'vitest';
import { seed, SEED_CONFIGS } from '@/lib/db/seed';

function createMockLogger() {
  return {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
    getCorrelationId: () => 'test-id',
  } as ReturnType<typeof import('@/lib/logger').createLogger>;
}

function createMockPrisma(existingKeys: string[] = []) {
  return {
    systemConfig: {
      findUnique: vi.fn().mockImplementation(({ where }: { where: { key: string } }) => {
        if (existingKeys.includes(where.key)) {
          return Promise.resolve({ key: where.key, value: 'existing', updatedAt: new Date() });
        }
        return Promise.resolve(null);
      }),
      create: vi.fn().mockResolvedValue({}),
    },
  } as unknown as import('@prisma/client').PrismaClient;
}

describe('SEED_CONFIGS', () => {
  it('should define token_scope with default 1000', () => {
    const tokenScope = SEED_CONFIGS.find((c) => c.key === 'token_scope');
    expect(tokenScope).toBeDefined();
    expect(tokenScope!.value).toBe(1000);
  });

  it('should define cmc_ingestion_hour with default 6', () => {
    const ingestionHour = SEED_CONFIGS.find((c) => c.key === 'cmc_ingestion_hour');
    expect(ingestionHour).toBeDefined();
    expect(ingestionHour!.value).toBe(6);
  });

  it('should have unique keys', () => {
    const keys = SEED_CONFIGS.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('should have descriptions for all configs', () => {
    for (const config of SEED_CONFIGS) {
      expect(config.description.length).toBeGreaterThan(0);
    }
  });
});

describe('seed()', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('should create all configs when none exist', async () => {
    const mockPrisma = createMockPrisma([]);

    const result = await seed(mockPrisma, mockLogger);

    expect(result.created).toBe(SEED_CONFIGS.length);
    expect(result.skipped).toBe(0);
    expect(mockPrisma.systemConfig.create).toHaveBeenCalledTimes(SEED_CONFIGS.length);
  });

  it('should skip configs that already exist (idempotent)', async () => {
    const existingKeys = SEED_CONFIGS.map((c) => c.key);
    const mockPrisma = createMockPrisma(existingKeys);

    const result = await seed(mockPrisma, mockLogger);

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(SEED_CONFIGS.length);
    expect(mockPrisma.systemConfig.create).not.toHaveBeenCalled();
  });

  it('should handle partial existing configs', async () => {
    const mockPrisma = createMockPrisma(['token_scope']);

    const result = await seed(mockPrisma, mockLogger);

    expect(result.created).toBe(SEED_CONFIGS.length - 1);
    expect(result.skipped).toBe(1);
  });

  it('should log start and completion', async () => {
    const mockPrisma = createMockPrisma([]);

    await seed(mockPrisma, mockLogger);

    expect(mockLogger.info).toHaveBeenCalledWith('seed.start', expect.any(Object));
    expect(mockLogger.info).toHaveBeenCalledWith('seed.complete', expect.objectContaining({
      durationMs: expect.any(Number),
    }));
  });

  it('should create configs with correct values', async () => {
    const mockPrisma = createMockPrisma([]);

    await seed(mockPrisma, mockLogger);

    expect(mockPrisma.systemConfig.create).toHaveBeenCalledWith({
      data: { key: 'token_scope', value: 1000 },
    });
    expect(mockPrisma.systemConfig.create).toHaveBeenCalledWith({
      data: { key: 'cmc_ingestion_hour', value: 6 },
    });
  });
});
