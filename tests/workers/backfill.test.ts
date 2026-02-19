import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runBackfill, computeRanks, startBackfill, pauseBackfill } from '@/workers/backfill';
import type { CMCClient, CMCHistoricalQuote } from '@/lib/cmc';
import type { PrismaClient, BackfillStatus } from '@prisma/client';
import type { Logger } from '@/lib/logger';

function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
    getCorrelationId: () => 'test-id',
  } as unknown as Logger;
}

function createMockQuote(date: string, marketCap: number, price: number = 100): CMCHistoricalQuote {
  return {
    timestamp: `${date}T00:00:00Z`,
    quote: {
      USD: {
        price,
        volume_24h: 1000000,
        market_cap: marketCap,
        circulating_supply: marketCap / price,
      },
    },
  };
}

interface MockJob {
  id: string;
  dateRangeStart: Date;
  dateRangeEnd: Date;
  tokenScope: number;
  status: BackfillStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  tokensProcessed: number;
  lastProcessedCmcId: number | null;
  errors: unknown;
  createdAt: Date;
  updatedAt: Date;
}

function createMockPrisma(options: {
  tokens?: Array<{ id: string; cmcId: number; symbol: string }>;
  job?: Partial<MockJob>;
  existingSnapshots?: boolean;
} = {}) {
  const defaultJob: MockJob = {
    id: 'job-1',
    dateRangeStart: new Date('2024-02-18'),
    dateRangeEnd: new Date('2026-02-18'),
    tokenScope: 1000,
    status: 'QUEUED',
    startedAt: null,
    completedAt: null,
    tokensProcessed: 0,
    lastProcessedCmcId: null,
    errors: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const job = { ...defaultJob, ...options.job };
  const tokens = options.tokens ?? [
    { id: 'token-1', cmcId: 1, symbol: 'BTC' },
    { id: 'token-2', cmcId: 1027, symbol: 'ETH' },
  ];

  const snapshotStore: Array<{ id: string; tokenId: string; date: Date; rank: number; marketCap: number }> = [];
  let snapshotCounter = 0;

  return {
    backfillJob: {
      findUniqueOrThrow: vi.fn().mockImplementation(() => Promise.resolve({ ...job })),
      findUnique: vi.fn().mockImplementation(({ where }: { where: { id?: string; dateRangeStart_dateRangeEnd_tokenScope?: unknown } }) => {
        if (where.id === job.id || where.dateRangeStart_dateRangeEnd_tokenScope) {
          return Promise.resolve({ ...job });
        }
        return Promise.resolve(null);
      }),
      update: vi.fn().mockImplementation(({ data }: { data: Partial<MockJob> }) => {
        Object.assign(job, data);
        return Promise.resolve({ ...job });
      }),
      create: vi.fn().mockImplementation(({ data }: { data: Partial<MockJob> }) => {
        Object.assign(job, data);
        return Promise.resolve({ ...job });
      }),
      findMany: vi.fn().mockResolvedValue([job]),
    },
    token: {
      findMany: vi.fn().mockResolvedValue(tokens),
    },
    dailySnapshot: {
      upsert: vi.fn().mockImplementation(({ create }: { create: { tokenId: string; date: Date; rank: number; marketCap: number } }) => {
        snapshotCounter++;
        const snapshot = {
          id: `snap-${snapshotCounter}`,
          tokenId: create.tokenId,
          date: create.date,
          rank: create.rank,
          marketCap: create.marketCap,
        };
        snapshotStore.push(snapshot);
        return Promise.resolve(snapshot);
      }),
      findMany: vi.fn().mockImplementation(({ where, distinct, orderBy }: {
        where?: { date?: Date | { gte?: Date; lte?: Date } };
        distinct?: string[];
        orderBy?: Record<string, string>;
      }) => {
        if (distinct?.includes('date')) {
          // Return unique dates
          const dates = [...new Set(snapshotStore.map((s) => s.date.toISOString()))];
          return Promise.resolve(dates.map((d) => ({ date: new Date(d) })));
        }
        // Return snapshots for a specific date
        const filtered = snapshotStore.filter(
          (s) => where?.date instanceof Date && s.date.toISOString() === (where.date as Date).toISOString()
        );
        if (orderBy?.marketCap === 'desc') {
          filtered.sort((a, b) => b.marketCap - a.marketCap);
        }
        return Promise.resolve(filtered);
      }),
      update: vi.fn().mockImplementation(({ where, data }: { where: { id: string }; data: { rank: number } }) => {
        const snapshot = snapshotStore.find((s) => s.id === where.id);
        if (snapshot) snapshot.rank = data.rank;
        return Promise.resolve(snapshot);
      }),
    },
    $transaction: vi.fn().mockImplementation((promises: Promise<unknown>[]) => Promise.all(promises)),
    _snapshotStore: snapshotStore,
    _job: job,
  } as unknown as PrismaClient & {
    _snapshotStore: Array<{ id: string; tokenId: string; date: Date; rank: number; marketCap: number }>;
    _job: MockJob;
  };
}

function createMockCMCClient(quotesPerToken: Record<number, CMCHistoricalQuote[]> = {}): CMCClient {
  return {
    getListings: vi.fn(),
    getHistoricalQuotes: vi.fn().mockImplementation((cmcId: number) => {
      return Promise.resolve(quotesPerToken[cmcId] ?? []);
    }),
    getTokenInfo: vi.fn(),
  } as unknown as CMCClient;
}

describe('runBackfill', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('should process all tokens and create snapshots', async () => {
    const quotes: Record<number, CMCHistoricalQuote[]> = {
      1: [createMockQuote('2025-01-01', 900000000000), createMockQuote('2025-01-02', 910000000000)],
      1027: [createMockQuote('2025-01-01', 400000000000), createMockQuote('2025-01-02', 410000000000)],
    };
    const mockPrisma = createMockPrisma();
    const mockCMC = createMockCMCClient(quotes);

    const result = await runBackfill('job-1', mockPrisma, mockCMC, mockLogger, 0);

    expect(result.tokensProcessed).toBe(2);
    expect(result.snapshotsCreated).toBe(4);
    expect(result.errors).toBe(0);
    expect(result.status).toBe('COMPLETE');
  });

  it('should resume from lastProcessedCmcId', async () => {
    const quotes: Record<number, CMCHistoricalQuote[]> = {
      1027: [createMockQuote('2025-01-01', 400000000000)],
    };
    const mockPrisma = createMockPrisma({
      job: { lastProcessedCmcId: 1, tokensProcessed: 1 },
    });
    const mockCMC = createMockCMCClient(quotes);

    const result = await runBackfill('job-1', mockPrisma, mockCMC, mockLogger, 0);

    // Should only process ETH (cmcId 1027), skipping BTC (cmcId 1)
    expect(mockCMC.getHistoricalQuotes).toHaveBeenCalledTimes(1);
    expect(mockCMC.getHistoricalQuotes).toHaveBeenCalledWith(1027, expect.any(Date), expect.any(Date));
    expect(result.tokensProcessed).toBe(2); // 1 previously + 1 new
  });

  it('should handle token errors without killing the job', async () => {
    const mockPrisma = createMockPrisma();
    const mockCMC = createMockCMCClient({});
    (mockCMC.getHistoricalQuotes as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('API rate limit'))
      .mockResolvedValueOnce([createMockQuote('2025-01-01', 400000000000)]);

    const result = await runBackfill('job-1', mockPrisma, mockCMC, mockLogger, 0);

    expect(result.errors).toBe(1);
    expect(result.tokensProcessed).toBe(2);
    expect(result.status).toBe('COMPLETE'); // < 50% failure
  });

  it('should mark job as FAILED when > 50% of tokens fail', async () => {
    const mockPrisma = createMockPrisma({
      tokens: [
        { id: 'token-1', cmcId: 1, symbol: 'BTC' },
        { id: 'token-2', cmcId: 2, symbol: 'ETH' },
        { id: 'token-3', cmcId: 3, symbol: 'BNB' },
      ],
    });
    const mockCMC = createMockCMCClient({});
    (mockCMC.getHistoricalQuotes as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce([createMockQuote('2025-01-01', 100000000)]);

    const result = await runBackfill('job-1', mockPrisma, mockCMC, mockLogger, 0);

    expect(result.errors).toBe(2);
    expect(result.status).toBe('FAILED');
  });

  it('should stop when job status is PAUSED', async () => {
    let checkCount = 0;
    const mockPrisma = createMockPrisma();
    // Call 1: initial job load. Call 2: pause check before token 1 (QUEUED).
    // Call 3: pause check before token 2 (PAUSED).
    (mockPrisma.backfillJob.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockImplementation(() => {
      checkCount++;
      const status = checkCount > 2 ? 'PAUSED' : 'QUEUED';
      return Promise.resolve({
        ...mockPrisma._job,
        status,
      });
    });
    const mockCMC = createMockCMCClient({
      1: [createMockQuote('2025-01-01', 900000000000)],
      1027: [createMockQuote('2025-01-01', 400000000000)],
    });

    const result = await runBackfill('job-1', mockPrisma, mockCMC, mockLogger, 0);

    expect(result.status).toBe('PAUSED');
    // Should have only processed the first token before pausing
    expect(result.tokensProcessed).toBe(1);
  });

  it('should set rank to 0 during backfill and compute later', async () => {
    const mockPrisma = createMockPrisma();
    const mockCMC = createMockCMCClient({
      1: [createMockQuote('2025-01-01', 900000000000)],
    });

    await runBackfill('job-1', mockPrisma, mockCMC, mockLogger, 0);

    // Verify snapshots created with rank 0
    expect(mockPrisma.dailySnapshot.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ rank: 0 }),
      })
    );
  });
});

describe('computeRanks', () => {
  it('should assign ranks based on market cap descending', async () => {
    const mockLogger = createMockLogger();

    // Pre-populate snapshot store
    const snapshotStore = [
      { id: 'snap-1', tokenId: 'token-1', date: new Date('2025-01-01'), rank: 0, marketCap: 900000000000 },
      { id: 'snap-2', tokenId: 'token-2', date: new Date('2025-01-01'), rank: 0, marketCap: 400000000000 },
      { id: 'snap-3', tokenId: 'token-3', date: new Date('2025-01-01'), rank: 0, marketCap: 600000000000 },
    ];

    const mockPrisma = {
      dailySnapshot: {
        findMany: vi.fn().mockImplementation(({ distinct }: {
          distinct?: string[];
          orderBy?: Record<string, string>;
        }) => {
          if (distinct?.includes('date')) {
            return Promise.resolve([{ date: new Date('2025-01-01') }]);
          }
          const sorted = [...snapshotStore].sort((a, b) => b.marketCap - a.marketCap);
          return Promise.resolve(sorted);
        }),
        update: vi.fn().mockImplementation(({ where, data }: { where: { id: string }; data: { rank: number } }) => {
          const snap = snapshotStore.find((s) => s.id === where.id);
          if (snap) snap.rank = data.rank;
          return Promise.resolve(snap);
        }),
      },
      $transaction: vi.fn().mockImplementation((promises: Promise<unknown>[]) => Promise.all(promises)),
    } as unknown as PrismaClient;

    const rankedDates = await computeRanks(
      mockPrisma,
      new Date('2025-01-01'),
      new Date('2025-01-01'),
      mockLogger
    );

    expect(rankedDates).toBe(1);

    // Verify ranks: BTC (900B) = 1, BNB (600B) = 2, ETH (400B) = 3
    expect(snapshotStore[0].rank).toBe(1); // 900B → rank 1
    expect(snapshotStore[2].rank).toBe(2); // 600B → rank 2
    expect(snapshotStore[1].rank).toBe(3); // 400B → rank 3
  });
});

describe('startBackfill', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('should return "already done" for COMPLETE jobs', async () => {
    const mockPrisma = createMockPrisma({ job: { status: 'COMPLETE' } });
    const mockCMC = createMockCMCClient();

    const result = await startBackfill(
      new Date('2024-02-18'),
      new Date('2026-02-18'),
      1000,
      mockPrisma,
      mockCMC,
      mockLogger
    );

    expect(result.status).toBe('COMPLETE');
    expect(result.message).toContain('already completed');
  });

  it('should return "already running" for RUNNING jobs', async () => {
    const mockPrisma = createMockPrisma({ job: { status: 'RUNNING' } });
    const mockCMC = createMockCMCClient();

    const result = await startBackfill(
      new Date('2024-02-18'),
      new Date('2026-02-18'),
      1000,
      mockPrisma,
      mockCMC,
      mockLogger
    );

    expect(result.status).toBe('RUNNING');
    expect(result.message).toContain('already in progress');
  });

  it('should resume FAILED jobs', async () => {
    const mockPrisma = createMockPrisma({ job: { status: 'FAILED' } });
    const mockCMC = createMockCMCClient();

    const result = await startBackfill(
      new Date('2024-02-18'),
      new Date('2026-02-18'),
      1000,
      mockPrisma,
      mockCMC,
      mockLogger
    );

    expect(result.status).toBe('QUEUED');
    expect(result.message).toContain('resumed');
  });

  it('should create new job when none exists', async () => {
    const mockPrisma = createMockPrisma();
    (mockPrisma.backfillJob.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const mockCMC = createMockCMCClient();

    const result = await startBackfill(
      new Date('2024-02-18'),
      new Date('2026-02-18'),
      1000,
      mockPrisma,
      mockCMC,
      mockLogger
    );

    expect(result.status).toBe('QUEUED');
    expect(result.message).toContain('started');
    expect(mockPrisma.backfillJob.create).toHaveBeenCalled();
  });
});

describe('pauseBackfill', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('should pause a RUNNING job', async () => {
    const mockPrisma = createMockPrisma({ job: { status: 'RUNNING' } });

    const result = await pauseBackfill('job-1', mockPrisma, mockLogger);

    expect(result.success).toBe(true);
    expect(mockPrisma.backfillJob.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: { status: 'PAUSED' },
    });
  });

  it('should reject pausing a non-RUNNING job', async () => {
    const mockPrisma = createMockPrisma({ job: { status: 'COMPLETE' } });

    const result = await pauseBackfill('job-1', mockPrisma, mockLogger);

    expect(result.success).toBe(false);
    expect(result.message).toContain('COMPLETE');
  });

  it('should return not found for unknown job', async () => {
    const mockPrisma = createMockPrisma();
    (mockPrisma.backfillJob.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await pauseBackfill('nonexistent', mockPrisma, mockLogger);

    expect(result.success).toBe(false);
    expect(result.message).toContain('not found');
  });
});
