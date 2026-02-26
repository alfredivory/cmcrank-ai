import type { ResearchConfig, ChatConfig, ClassificationConfig } from './types';

const DEFAULT_CONFIG: ResearchConfig = {
  model: 'claude-opus-4-6',
  maxSearches: 20,
  maxTokens: 16384,
};

const DEFAULT_CHAT_CONFIG: ChatConfig = {
  model: 'claude-sonnet-4-6',
  maxTokens: 4096,
  maxContextMessages: 50,
};

const DEFAULT_CLASSIFICATION_CONFIG: ClassificationConfig = {
  model: 'claude-haiku-4-5-20251001',
  maxTokens: 2048,
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

/**
 * Returns the chat configuration.
 * Reads from environment variables with fallbacks to defaults.
 */
export function getChatConfig(): ChatConfig {
  const model = process.env.AI_CHAT_MODEL || DEFAULT_CHAT_CONFIG.model;
  const maxTokens = parseInt(process.env.AI_CHAT_MAX_TOKENS || '', 10);
  const maxContextMessages = parseInt(process.env.AI_CHAT_MAX_CONTEXT || '', 10);

  return {
    model,
    maxTokens: isNaN(maxTokens) ? DEFAULT_CHAT_CONFIG.maxTokens : maxTokens,
    maxContextMessages: isNaN(maxContextMessages) ? DEFAULT_CHAT_CONFIG.maxContextMessages : maxContextMessages,
  };
}

/**
 * Returns the classification configuration.
 * Reads from environment variables with fallbacks to defaults.
 */
export function getClassificationConfig(): ClassificationConfig {
  const model = process.env.AI_CLASSIFICATION_MODEL || DEFAULT_CLASSIFICATION_CONFIG.model;
  const maxTokens = parseInt(process.env.AI_CLASSIFICATION_MAX_TOKENS || '', 10);

  return {
    model,
    maxTokens: isNaN(maxTokens) ? DEFAULT_CLASSIFICATION_CONFIG.maxTokens : maxTokens,
  };
}
