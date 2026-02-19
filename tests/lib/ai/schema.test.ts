import { describe, it, expect } from 'vitest';
import { validateResearchResponse } from '@/lib/ai/schema';

const validResponse = {
  report: {
    executiveSummary: 'Bitcoin experienced significant growth.',
    findings: [
      { title: 'ETF Approval', content: 'The SEC approved spot Bitcoin ETFs.' },
    ],
    sources: [
      { url: 'https://example.com/article', title: 'BTC ETF News', domain: 'example.com' },
    ],
  },
  events: [
    {
      date: '2024-01-10',
      title: 'Spot ETF approved',
      description: 'SEC approves spot Bitcoin ETFs',
      eventType: 'REGULATORY',
      sourceUrl: 'https://example.com',
      importanceScore: 90,
    },
  ],
  overallImportanceScore: 85,
};

describe('validateResearchResponse', () => {
  it('accepts a valid response', () => {
    const result = validateResearchResponse(validResponse);
    expect(result.report.executiveSummary).toBe('Bitcoin experienced significant growth.');
    expect(result.report.findings).toHaveLength(1);
    expect(result.events).toHaveLength(1);
    expect(result.overallImportanceScore).toBe(85);
  });

  it('throws on null input', () => {
    expect(() => validateResearchResponse(null)).toThrow('JSON object');
  });

  it('throws on missing report', () => {
    expect(() => validateResearchResponse({ events: [] })).toThrow('report object');
  });

  it('throws on missing executiveSummary', () => {
    expect(() =>
      validateResearchResponse({
        report: { findings: [], sources: [] },
        events: [],
      })
    ).toThrow('executiveSummary');
  });

  it('throws when findings are empty', () => {
    expect(() =>
      validateResearchResponse({
        report: { executiveSummary: 'Test', findings: [], sources: [] },
        events: [],
      })
    ).toThrow('at least one finding');
  });

  it('clamps importance scores to 0-100', () => {
    const input = {
      ...validResponse,
      overallImportanceScore: 150,
      events: [{ ...validResponse.events[0], importanceScore: -10 }],
    };
    const result = validateResearchResponse(input);
    expect(result.overallImportanceScore).toBe(100);
    expect(result.events[0].importanceScore).toBe(0);
  });

  it('maps invalid event types to OTHER', () => {
    const input = {
      ...validResponse,
      events: [{ ...validResponse.events[0], eventType: 'INVALID_TYPE' }],
    };
    const result = validateResearchResponse(input);
    expect(result.events[0].eventType).toBe('OTHER');
  });

  it('filters out events with invalid dates', () => {
    const input = {
      ...validResponse,
      events: [
        { ...validResponse.events[0] },
        { ...validResponse.events[0], date: 'not-a-date' },
      ],
    };
    const result = validateResearchResponse(input);
    expect(result.events).toHaveLength(1);
  });

  it('extracts domain from source URL if domain missing', () => {
    const input = {
      ...validResponse,
      report: {
        ...validResponse.report,
        sources: [{ url: 'https://www.reuters.com/article', title: 'Test' }],
      },
    };
    const result = validateResearchResponse(input);
    expect(result.report.sources[0].domain).toBe('reuters.com');
  });

  it('truncates event titles to 120 chars', () => {
    const longTitle = 'A'.repeat(200);
    const input = {
      ...validResponse,
      events: [{ ...validResponse.events[0], title: longTitle }],
    };
    const result = validateResearchResponse(input);
    expect(result.events[0].title).toHaveLength(120);
  });

  it('defaults overallImportanceScore to 50 when missing', () => {
    const input = { ...validResponse };
    delete (input as Record<string, unknown>).overallImportanceScore;
    const result = validateResearchResponse(input);
    expect(result.overallImportanceScore).toBe(50);
  });
});
