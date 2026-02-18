import { createLogger, Logger } from '@/lib/logger';

const CMC_API_BASE = 'https://pro-api.coinmarketcap.com';

export interface CMCToken {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmc_rank: number;
  num_market_pairs: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  last_updated: string;
  date_added: string;
  tags: string[];
  platform: {
    id: number;
    name: string;
    symbol: string;
    slug: string;
  } | null;
  quote: {
    USD: {
      price: number;
      volume_24h: number;
      volume_change_24h: number;
      percent_change_1h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      percent_change_30d: number;
      market_cap: number;
      market_cap_dominance: number;
      fully_diluted_market_cap: number;
      last_updated: string;
    };
  };
}

export interface CMCListingsResponse {
  status: {
    timestamp: string;
    error_code: number;
    error_message: string | null;
    elapsed: number;
    credit_count: number;
    notice: string | null;
    total_count: number;
  };
  data: CMCToken[];
}

export interface CMCHistoricalQuote {
  timestamp: string;
  quote: {
    USD: {
      price: number;
      volume_24h: number;
      market_cap: number;
      circulating_supply: number;
    };
  };
}

export class CMCClient {
  private apiKey: string;
  private logger: Logger;

  constructor(apiKey?: string, logger?: Logger) {
    this.apiKey = apiKey || process.env.CMC_API_KEY || '';
    this.logger = logger || createLogger('api');
    
    if (!this.apiKey) {
      throw new Error('CMC_API_KEY is required');
    }
  }

  private async fetch<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
    const url = new URL(`${CMC_API_BASE}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    const startTime = Date.now();
    
    this.logger.debug('cmc.request.start', {
      metadata: { endpoint, params },
    });

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey,
          'Accept': 'application/json',
        },
      });

      const durationMs = Date.now() - startTime;
      const data = await response.json();

      if (!response.ok) {
        this.logger.error('cmc.request.failed', data.status?.error_message || 'Unknown error', {
          durationMs,
          metadata: { 
            endpoint, 
            statusCode: response.status,
            creditCount: data.status?.credit_count,
          },
        });
        throw new Error(data.status?.error_message || `CMC API error: ${response.status}`);
      }

      this.logger.info('cmc.request.success', {
        durationMs,
        metadata: {
          endpoint,
          creditCount: data.status?.credit_count,
          totalCount: data.status?.total_count,
        },
      });

      return data as T;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.logger.error('cmc.request.error', error as Error, {
        durationMs,
        metadata: { endpoint },
      });
      throw error;
    }
  }

  /**
   * Get latest listings with rank, price, market cap, etc.
   */
  async getListings(limit: number = 100, start: number = 1): Promise<CMCListingsResponse> {
    return this.fetch<CMCListingsResponse>('/v1/cryptocurrency/listings/latest', {
      limit,
      start,
      convert: 'USD',
    });
  }

  /**
   * Get historical daily OHLCV data for a specific token
   * Note: Requires Startup plan or higher
   */
  async getHistoricalQuotes(
    cmcId: number,
    timeStart: Date,
    timeEnd: Date
  ): Promise<CMCHistoricalQuote[]> {
    const response = await this.fetch<{
      status: { credit_count: number };
      data: { quotes: CMCHistoricalQuote[] };
    }>('/v2/cryptocurrency/quotes/historical', {
      id: cmcId,
      time_start: timeStart.toISOString(),
      time_end: timeEnd.toISOString(),
      interval: 'daily',
      convert: 'USD',
    });

    return response.data.quotes;
  }

  /**
   * Get token metadata (categories, description, logo, etc.)
   */
  async getTokenInfo(cmcIds: number[]): Promise<Record<string, CMCToken>> {
    const response = await this.fetch<{
      status: { credit_count: number };
      data: Record<string, CMCToken>;
    }>('/v2/cryptocurrency/info', {
      id: cmcIds.join(','),
    });

    return response.data;
  }
}

// Singleton instance for use across the app
let cmcClient: CMCClient | null = null;

export function getCMCClient(logger?: Logger): CMCClient {
  if (!cmcClient) {
    cmcClient = new CMCClient(undefined, logger);
  }
  return cmcClient;
}
