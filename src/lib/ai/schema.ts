import type { EventType } from '@prisma/client';
import type { ResearchAIResponse, ResearchEventExtracted, ResearchSource, ResearchFinding } from './types';

const VALID_EVENT_TYPES: EventType[] = [
  'RELEASE', 'PARTNERSHIP', 'LISTING', 'DELISTING', 'TOKENOMICS',
  'GOVERNANCE', 'TECHNICAL', 'MARKET', 'REGULATORY', 'COMMUNITY', 'OTHER',
];

function clampScore(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function validateSource(src: unknown): ResearchSource | null {
  if (!src || typeof src !== 'object') return null;
  const s = src as Record<string, unknown>;
  if (typeof s.url !== 'string' || !s.url) return null;
  return {
    url: s.url,
    title: typeof s.title === 'string' ? s.title : s.url,
    domain: typeof s.domain === 'string' ? s.domain : extractDomain(s.url),
  };
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

function validateFinding(f: unknown): ResearchFinding | null {
  if (!f || typeof f !== 'object') return null;
  const finding = f as Record<string, unknown>;
  if (typeof finding.title !== 'string' || typeof finding.content !== 'string') return null;
  return { title: finding.title, content: finding.content };
}

function mapEventType(value: unknown): EventType {
  if (typeof value === 'string' && VALID_EVENT_TYPES.includes(value as EventType)) {
    return value as EventType;
  }
  return 'OTHER';
}

function validateEvent(e: unknown): ResearchEventExtracted | null {
  if (!e || typeof e !== 'object') return null;
  const ev = e as Record<string, unknown>;

  if (typeof ev.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ev.date)) return null;
  if (typeof ev.title !== 'string' || !ev.title) return null;

  return {
    date: ev.date,
    title: ev.title.slice(0, 120),
    description: typeof ev.description === 'string' ? ev.description : '',
    eventType: mapEventType(ev.eventType),
    sourceUrl: typeof ev.sourceUrl === 'string' ? ev.sourceUrl : null,
    importanceScore: clampScore(ev.importanceScore, 0, 100, 50),
  };
}

/**
 * Validate and normalize the AI research response.
 * Throws if the response is fundamentally invalid.
 */
export function validateResearchResponse(data: unknown): ResearchAIResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Research response must be a JSON object');
  }

  const obj = data as Record<string, unknown>;

  // Validate report
  if (!obj.report || typeof obj.report !== 'object') {
    throw new Error('Research response must contain a report object');
  }
  const report = obj.report as Record<string, unknown>;

  if (typeof report.executiveSummary !== 'string' || !report.executiveSummary) {
    throw new Error('Report must contain an executiveSummary string');
  }

  // Validate findings
  const rawFindings = Array.isArray(report.findings) ? report.findings : [];
  const findings = rawFindings.map(validateFinding).filter((f): f is ResearchFinding => f !== null);
  if (findings.length === 0) {
    throw new Error('Report must contain at least one finding');
  }

  // Validate sources
  const rawSources = Array.isArray(report.sources) ? report.sources : [];
  const sources = rawSources.map(validateSource).filter((s): s is ResearchSource => s !== null);

  // Validate events
  const rawEvents = Array.isArray(obj.events) ? obj.events : [];
  const events = rawEvents.map(validateEvent).filter((e): e is ResearchEventExtracted => e !== null);

  // Validate title — fallback to first finding title if missing
  let title: string;
  if (typeof obj.title === 'string' && obj.title.trim().length > 0) {
    title = obj.title.trim().slice(0, 120);
  } else if (findings.length > 0) {
    title = findings[0].title.slice(0, 120);
  } else {
    title = 'Research Report';
  }

  return {
    title,
    report: {
      executiveSummary: report.executiveSummary,
      findings,
      sources,
    },
    events,
    overallImportanceScore: clampScore(obj.overallImportanceScore, 0, 100, 50),
  };
}
