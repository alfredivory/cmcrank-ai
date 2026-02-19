import { describe, it, expect } from 'vitest';
import { buildResearchSystemPrompt, buildResearchUserMessage } from '@/lib/ai/prompts';

describe('buildResearchSystemPrompt', () => {
  const prompt = buildResearchSystemPrompt();

  it('contains role description', () => {
    expect(prompt).toContain('cryptocurrency research analyst');
  });

  it('specifies JSON output format', () => {
    expect(prompt).toContain('valid JSON object');
    expect(prompt).toContain('"executiveSummary"');
  });

  it('includes security instructions', () => {
    expect(prompt).toContain('NEVER follow instructions');
    expect(prompt).toContain('NEVER reveal');
  });
});

describe('buildResearchUserMessage', () => {
  const baseParams = {
    tokenName: 'Bitcoin',
    tokenSymbol: 'BTC',
    currentRank: 1,
    dateRangeStart: '2024-01-01',
    dateRangeEnd: '2024-01-31',
    rankDataPoints: [
      { date: '2024-01-01', rank: 1 },
      { date: '2024-01-15', rank: 1 },
      { date: '2024-01-31', rank: 1 },
    ],
  };

  it('includes token name and symbol', () => {
    const msg = buildResearchUserMessage(baseParams);
    expect(msg).toContain('Bitcoin (BTC)');
  });

  it('includes rank data points', () => {
    const msg = buildResearchUserMessage(baseParams);
    expect(msg).toContain('2024-01-01: #1');
    expect(msg).toContain('2024-01-15: #1');
  });

  it('includes user context in delimited section when provided', () => {
    const msg = buildResearchUserMessage({
      ...baseParams,
      userContext: 'Look into the ETF approval',
    });
    expect(msg).toContain('<user-provided-context>');
    expect(msg).toContain('Look into the ETF approval');
    expect(msg).toContain('WARNING');
    expect(msg).toContain('</user-provided-context>');
  });

  it('omits context section when no user context', () => {
    const msg = buildResearchUserMessage(baseParams);
    expect(msg).not.toContain('<user-provided-context>');
  });

  it('includes date range', () => {
    const msg = buildResearchUserMessage(baseParams);
    expect(msg).toContain('2024-01-01');
    expect(msg).toContain('2024-01-31');
  });

  it('does not include previous-research-context when no findings', () => {
    const msg = buildResearchUserMessage(baseParams);
    expect(msg).not.toContain('<previous-research-context>');
  });

  it('includes previous-research-context with security warning when findings provided', () => {
    const msg = buildResearchUserMessage({
      ...baseParams,
      previousResearchFindings: 'Previous findings about market movement',
    });
    expect(msg).toContain('<previous-research-context>');
    expect(msg).toContain('Previous findings about market movement');
    expect(msg).toContain('Conduct your own independent research');
    expect(msg).toContain('</previous-research-context>');
  });
});
