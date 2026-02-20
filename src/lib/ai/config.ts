import type { ResearchConfig } from './types';

const DEFAULT_CONFIG: ResearchConfig = {
  model: 'claude-opus-4-6',
  maxSearches: 20,
  maxTokens: 16384,
};

/**
 * Returns the research configuration.
 * Reads from environment variables with fallbacks to defaults.
 */
export function getResearchConfig(): ResearchConfig {
  const model = process.env.AI_MODEL || DEFAULT_CONFIG.model;
  const maxSearches = parseInt(process.env.AI_MAX_SEARCHES || '', 10);
  const maxTokens = parseInt(process.env.AI_MAX_TOKENS || '', 10);

  return {
    model,
    maxSearches: isNaN(maxSearches) ? DEFAULT_CONFIG.maxSearches : maxSearches,
    maxTokens: isNaN(maxTokens) ? DEFAULT_CONFIG.maxTokens : maxTokens,
  };
}
