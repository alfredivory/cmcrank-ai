const MAX_USER_CONTEXT_LENGTH = 2000;
const MAX_DATE_RANGE_DAYS = 730;

// Patterns that look like prompt injection attempts
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/gi,
  /ignore\s+(all\s+)?above\s+instructions/gi,
  /disregard\s+(all\s+)?previous/gi,
  /you\s+are\s+now\s+a/gi,
  /system\s*:\s/gi,
  /assistant\s*:\s/gi,
  /\[INST\]/gi,
  /<<SYS>>/gi,
  /<\|im_start\|>/gi,
  /BEGIN\s+SYSTEM\s+PROMPT/gi,
  /END\s+SYSTEM\s+PROMPT/gi,
  /reveal\s+(your|the)\s+(system\s+)?prompt/gi,
  /output\s+(your|the)\s+(system\s+)?prompt/gi,
  /what\s+are\s+your\s+instructions/gi,
];

/**
 * Sanitize user-provided context for research.
 * Strips prompt injection patterns, enforces max length, preserves URLs.
 */
export function sanitizeUserContext(input: string): string {
  let sanitized = input.trim();

  // Enforce max length
  if (sanitized.length > MAX_USER_CONTEXT_LENGTH) {
    sanitized = sanitized.slice(0, MAX_USER_CONTEXT_LENGTH);
  }

  // Strip prompt injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[removed]');
  }

  // Strip null bytes
  sanitized = sanitized.replace(/\0/g, '');

  return sanitized;
}

/**
 * Validate a date range for research.
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateDateRange(
  start: Date,
  end: Date
): { valid: boolean; error?: string } {
  if (isNaN(start.getTime())) {
    return { valid: false, error: 'Invalid start date' };
  }
  if (isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid end date' };
  }
  if (start >= end) {
    return { valid: false, error: 'Start date must be before end date' };
  }

  const now = new Date();
  // Allow up to end of today
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (end > endOfToday) {
    return { valid: false, error: 'End date cannot be in the future' };
  }

  const diffMs = end.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays > MAX_DATE_RANGE_DAYS) {
    return { valid: false, error: `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days` };
  }

  return { valid: true };
}
