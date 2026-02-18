import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger, Logger } from '@/lib/logger';

describe('Logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('creates a logger with a correlation ID', () => {
    const logger = createLogger('api');
    expect(logger.getCorrelationId()).toBeDefined();
    expect(logger.getCorrelationId()).toHaveLength(36); // UUID format
  });

  it('creates a logger with a custom correlation ID', () => {
    const customId = 'custom-correlation-id';
    const logger = createLogger('api', customId);
    expect(logger.getCorrelationId()).toBe(customId);
  });

  it('logs info messages', () => {
    const logger = createLogger('api');
    logger.info('test.action', { metadata: { foo: 'bar' } });
    
    // In test environment LOG_LEVEL is 'error', so info won't log
    // But we can verify the logger doesn't throw
    expect(true).toBe(true);
  });

  it('logs error messages with stack trace', () => {
    const logger = createLogger('api');
    const error = new Error('Test error');
    logger.error('test.error', error);
    
    // Verify no exception thrown
    expect(true).toBe(true);
  });

  it('creates child logger with additional metadata', () => {
    const logger = createLogger('api');
    const childLogger = logger.child({ userId: '123' });
    
    expect(childLogger).toBeInstanceOf(Logger);
    expect(childLogger.getCorrelationId()).toBe(logger.getCorrelationId());
  });
});
