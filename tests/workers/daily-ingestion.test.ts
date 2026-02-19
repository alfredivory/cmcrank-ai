import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runDailyIngestion } from '@/workers/daily-ingestion';
import type { CMCToken, CMCListingsResponse, CMCClient } from '@/lib/cmc';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from '@/lib/logger';

function createMockToken(overrides: Partial<CMCToken> = {}): CMCToken {
  return {
    id: 1,
    name: 'Bitcoin',
    symbol: 'BTC',
    slug: 'bitcoin',
    cmc_rank: 1,
    num_market_pairs: 1000,
    circulating_supply: 19000000,
    total_supply: 21000000,
    max_supply: 21000000,
    last_updated: '2026-02-18T00:00:00Z',
    date_added: '2013-04-28T00:00:00Z',
    tags: ['mineable', 'pow'],
    platform: null,
    quote: {
      USD: {
        price: 50000,
        volume_24h: 30000000000,
        volume_change_24h: 5,
        percent_change_1h: 0.1,
        percent_change_24h: 1.5,
        percent_change_7d: 3.2,
        percent_change_30d: 10,
        market_cap: 950000000000,
        market_cap_dominance: 45,
        fully_diluted_market_cap: 1050000000000,
        last_updated: '2026-02-18T00:00:00Z',
      },
    },
    ...overrides,
  };
}

function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
    getCorrelationId: () => 'test-correlation-id',
  } as unknown as Logger;
}

function createMockCMCClient(tokens: CMCToken[]): CMCClient {
  return {
    getListings: vi.fn().mockResolvedValue({
      status: {
        timestamp: '2026-02-18T00:00:00Z',
        error_code: 0,
        error_message: null,
        elapsed: 10,
        credit_count: 1,
        notice: null,
        total_count: tokens.length,
      },
      data: tokens,
    } as CMCListingsResponse),
    getHistoricalQuotes: vi.fn(),
    getTokenInfo: vi.fn(),
  } as unknown as CMCClient;
}

function createMockPrisma() {
  const upsertedTokens = new Map<number, { id: string; cmcId: number }>();
  let tokenCounter = 0;

  return {
    systemConfig: {
      findUnique: vi.fn().mockResolvedValue({ key: 'token_scope', value: 1000, updatedAt: new Date() }),
    },
    token: {
      upsert: vi.fn().mockImplementation(({ where, create }: { where: { cmcId: number }; create: { cmcId: number } }) => {
        const cmcId = where.cmcId ?? create.cmcId;
        if (!upsertedTokens.has(cmcId)) {
          tokenCounter++;
          upsertedTokens.set(cmcId, { id: `token-${tokenCounter}`, cmcId });
        }
        return Promise.resolve(upsertedTokens.get(cmcId));
      }),
    },
    dailySnapshot: {
      findUnique: vi.fn().mockResolvedValue(null), // No existing snapshots by default
      create: vi.fn().mockResolvedValue({}),
    },
    _upsertedTokens: upsertedTokens,
  } as unknown as PrismaClient & { _upsertedTokens: Map<number, { id: string; cmcId: number }> };
}

describe('runDailyIngestion', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('should process tokens and create snapshots', async () => {
    const tokens = [
      createMockToken({ id: 1, symbol: 'BTC', cmc_rank: 1 }),
      createMockToken({ id: 1027, symbol: 'ETH', name: 'Ethereum', slug: 'ethereum', cmc_rank: 2 }),
    ];
    const mockPrisma = createMockPrisma();
    const mockCMC = createMockCMCClient(tokens);

    const result = await runDailyIngestion(mockPrisma, mockCMC, mockLogger);

    expect(result.tokensProcessed).toBe(2);
    expect(result.snapshotsCreated).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should read token_scope from SystemConfig', async () => {
    const mockPrisma = createMockPrisma();
    const mockCMC = createMockCMCClient([createMockToken()]);

    await runDailyIngestion(mockPrisma, mockCMC, mockLogger);

    expect(mockPrisma.systemConfig.findUnique).toHaveBeenCalledWith({
      where: { key: 'token_scope' },
    });
    expect(mockCMC.getListings).toHaveBeenCalledWith(1000);
  });

  it('should use default 1000 when SystemConfig has no token_scope', async () => {
    const mockPrisma = createMockPrisma();
    (mockPrisma.systemConfig.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const mockCMC = createMockCMCClient([]);

    await runDailyIngestion(mockPrisma, mockCMC, mockLogger);

    expect(mockCMC.getListings).toHaveBeenCalledWith(1000);
  });

  it('should skip snapshot if one already exists for today (dedup)', async () => {
    const mockPrisma = createMockPrisma();
    (mockPrisma.dailySnapshot.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'existing-snapshot',
    });
    const mockCMC = createMockCMCClient([createMockToken()]);

    const result = await runDailyIngestion(mockPrisma, mockCMC, mockLogger);

    expect(result.snapshotsCreated).toBe(0);
    expect(result.skipped).toBe(1);
    expect(mockPrisma.dailySnapshot.create).not.toHaveBeenCalled();
  });

  it('should upsert token data from CMC response', async () => {
    const token = createMockToken({
      id: 42,
      name: 'TestCoin',
      symbol: 'TST',
      slug: 'testcoin',
      tags: ['defi', 'layer-2'],
      platform: { id: 1, name: 'Ethereum', symbol: 'ETH', slug: 'ethereum' },
      date_added: '2024-01-15T00:00:00Z',
    });
    const mockPrisma = createMockPrisma();
    const mockCMC = createMockCMCClient([token]);

    await runDailyIngestion(mockPrisma, mockCMC, mockLogger);

    expect(mockPrisma.token.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cmcId: 42 },
        create: expect.objectContaining({
          cmcId: 42,
          name: 'TestCoin',
          symbol: 'TST',
          slug: 'testcoin',
          categories: ['defi', 'layer-2'],
          chain: 'Ethereum',
        }),
      })
    );
  });

  it('should create snapshot with correct market data', async () => {
    const token = createMockToken({
      id: 1,
      cmc_rank: 1,
      circulating_supply: 19000000,
      quote: {
        USD: {
          price: 50000,
          volume_24h: 30000000000,
          volume_change_24h: 5,
          percent_change_1h: 0.1,
          percent_change_24h: 1.5,
          percent_change_7d: 3.2,
          percent_change_30d: 10,
          market_cap: 950000000000,
          market_cap_dominance: 45,
          fully_diluted_market_cap: 1050000000000,
          last_updated: '2026-02-18T00:00:00Z',
        },
      },
    });
    const mockPrisma = createMockPrisma();
    const mockCMC = createMockCMCClient([token]);

    await runDailyIngestion(mockPrisma, mockCMC, mockLogger);

    expect(mockPrisma.dailySnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        rank: 1,
        marketCap: 950000000000,
        priceUsd: 50000,
        volume24h: 30000000000,
        circulatingSupply: 19000000,
      }),
    });
  });

  it('should continue processing tokens when one fails', async () => {
    const tokens = [
      createMockToken({ id: 1, symbol: 'BTC', cmc_rank: 1 }),
      createMockToken({ id: 2, symbol: 'ETH', cmc_rank: 2 }),
      createMockToken({ id: 3, symbol: 'BNB', cmc_rank: 3 }),
    ];
    const mockPrisma = createMockPrisma();
    const mockCMC = createMockCMCClient(tokens);

    // Make the second token fail on upsert
    let callCount = 0;
    (mockPrisma.token.upsert as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      if (callCount === 2) {
        return Promise.reject(new Error('DB error'));
      }
      return Promise.resolve({ id: `token-${callCount}`, cmcId: callCount });
    });

    const result = await runDailyIngestion(mockPrisma, mockCMC, mockLogger);

    expect(result.tokensProcessed).toBe(3);
    expect(result.snapshotsCreated).toBe(2);
    expect(result.errors).toBe(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'ingestion.token.error',
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('should log start and completion', async () => {
    const mockPrisma = createMockPrisma();
    const mockCMC = createMockCMCClient([]);

    await runDailyIngestion(mockPrisma, mockCMC, mockLogger);

    expect(mockLogger.info).toHaveBeenCalledWith('ingestion.start', expect.any(Object));
    expect(mockLogger.info).toHaveBeenCalledWith('ingestion.complete', expect.objectContaining({
      durationMs: expect.any(Number),
    }));
  });

  it('should handle empty CMC response', async () => {
    const mockPrisma = createMockPrisma();
    const mockCMC = createMockCMCClient([]);

    const result = await runDailyIngestion(mockPrisma, mockCMC, mockLogger);

    expect(result.tokensProcessed).toBe(0);
    expect(result.snapshotsCreated).toBe(0);
    expect(result.errors).toBe(0);
  });

  it('should set chain to null when token has no platform', async () => {
    const token = createMockToken({ platform: null });
    const mockPrisma = createMockPrisma();
    const mockCMC = createMockCMCClient([token]);

    await runDailyIngestion(mockPrisma, mockCMC, mockLogger);

    expect(mockPrisma.token.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ chain: null }),
      })
    );
  });
});
