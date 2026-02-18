import { v4 as uuidv4 } from 'uuid';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  correlationId: string;
  service: 'api' | 'worker' | 'cron';
  action: string;
  userId?: string;
  tokenId?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  error?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLogLevel = (process.env.LOG_LEVEL?.toUpperCase() as LogLevel) || 
  (process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG');

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel];
}

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

class Logger {
  private correlationId: string;
  private service: 'api' | 'worker' | 'cron';
  private defaultMetadata: Record<string, unknown>;

  constructor(
    service: 'api' | 'worker' | 'cron' = 'api',
    correlationId?: string,
    defaultMetadata: Record<string, unknown> = {}
  ) {
    this.service = service;
    this.correlationId = correlationId || uuidv4();
    this.defaultMetadata = defaultMetadata;
  }

  private log(
    level: LogLevel,
    action: string,
    options: Partial<Omit<LogEntry, 'timestamp' | 'level' | 'correlationId' | 'service' | 'action'>> = {}
  ): void {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      correlationId: this.correlationId,
      service: this.service,
      action,
      ...options,
      metadata: { ...this.defaultMetadata, ...options.metadata },
    };

    const output = formatLog(entry);
    
    switch (level) {
      case 'ERROR':
        console.error(output);
        break;
      case 'WARN':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  debug(action: string, options?: Partial<Omit<LogEntry, 'timestamp' | 'level' | 'correlationId' | 'service' | 'action'>>): void {
    this.log('DEBUG', action, options);
  }

  info(action: string, options?: Partial<Omit<LogEntry, 'timestamp' | 'level' | 'correlationId' | 'service' | 'action'>>): void {
    this.log('INFO', action, options);
  }

  warn(action: string, options?: Partial<Omit<LogEntry, 'timestamp' | 'level' | 'correlationId' | 'service' | 'action'>>): void {
    this.log('WARN', action, options);
  }

  error(action: string, error: Error | string, options?: Partial<Omit<LogEntry, 'timestamp' | 'level' | 'correlationId' | 'service' | 'action' | 'error'>>): void {
    const errorString = error instanceof Error ? `${error.message}\n${error.stack}` : error;
    this.log('ERROR', action, { ...options, error: errorString });
  }

  child(metadata: Record<string, unknown>): Logger {
    return new Logger(this.service, this.correlationId, {
      ...this.defaultMetadata,
      ...metadata,
    });
  }

  getCorrelationId(): string {
    return this.correlationId;
  }
}

export function createLogger(
  service: 'api' | 'worker' | 'cron' = 'api',
  correlationId?: string
): Logger {
  return new Logger(service, correlationId);
}

export function createRequestLogger(
  request: Request,
  service: 'api' | 'worker' | 'cron' = 'api'
): Logger {
  const correlationId = request.headers.get('x-correlation-id') || uuidv4();
  return new Logger(service, correlationId);
}

export { Logger };
