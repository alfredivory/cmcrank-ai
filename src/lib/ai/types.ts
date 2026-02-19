import type { EventType } from '@prisma/client';

// ============================================================================
// AI Research Response Types
// ============================================================================

export interface ResearchSource {
  url: string;
  title: string;
  domain: string;
}

export interface ResearchFinding {
  title: string;
  content: string; // markdown
}

export interface ResearchReport {
  executiveSummary: string;
  findings: ResearchFinding[];
  sources: ResearchSource[];
}

export interface ResearchEventExtracted {
  date: string; // YYYY-MM-DD
  title: string;
  description: string;
  eventType: EventType;
  sourceUrl: string | null;
  importanceScore: number; // 0-100
}

export interface ResearchAIResponse {
  title: string; // Short memorable title (3-6 words)
  report: ResearchReport;
  events: ResearchEventExtracted[];
  overallImportanceScore: number; // 0-100
}

// ============================================================================
// Research Request Parameters
// ============================================================================

export interface ResearchRequestParams {
  tokenName: string;
  tokenSymbol: string;
  currentRank: number;
  dateRangeStart: string; // YYYY-MM-DD
  dateRangeEnd: string; // YYYY-MM-DD
  rankDataPoints: { date: string; rank: number }[];
  userContext?: string;
  previousResearchFindings?: string;
}

// ============================================================================
// Research Configuration
// ============================================================================

export interface ResearchConfig {
  model: string;
  maxSearches: number;
  maxTokens: number;
}
