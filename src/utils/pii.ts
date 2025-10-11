// ═══════════════════════════════════════════════════════════════
// 🔒 PII (Personally Identifiable Information) Utilities
// ═══════════════════════════════════════════════════════════════

/**
 * Redacts PII from text before sending to external services.
 * Removes emails, phone numbers, and other sensitive data.
 */
export function redact(text: string): string {
  if (!text) return text;

  let redacted = text;

  // Redact email addresses
  redacted = redacted.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');

  // Redact phone numbers (various formats)
  // US: (123) 456-7890, 123-456-7890, 1234567890
  redacted = redacted.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
  redacted = redacted.replace(/\(\d{3}\)\s*\d{3}[-.]?\d{4}/g, '[PHONE]');

  // Redact international phone numbers (+XX)
  redacted = redacted.replace(/\+\d{1,3}\s?\d{1,14}/g, '[PHONE]');

  // Redact credit card numbers (simple pattern)
  redacted = redacted.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]');

  // Redact SSN-like patterns (XXX-XX-XXXX)
  redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');

  // Redact URLs (optional - keep domain for context)
  redacted = redacted.replace(/https?:\/\/[^\s]+/g, (url) => {
    try {
      const domain = new URL(url).hostname;
      return `[URL:${domain}]`;
    } catch {
      return '[URL]';
    }
  });

  return redacted;
}

/**
 * Checks if text contains potential PII.
 */
export function containsPII(text: string): boolean {
  if (!text) return false;

  // Check for email
  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text)) return true;

  // Check for phone numbers
  if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(text)) return true;
  if (/\+\d{1,3}\s?\d{1,14}/.test(text)) return true;

  // Check for credit cards
  if (/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(text)) return true;

  // Check for SSN
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) return true;

  return false;
}

/**
 * Sanitizes text for safe use in API queries.
 * More aggressive than redact - removes all potentially sensitive info.
 */
export function sanitizeForAPI(text: string, maxLength: number = 200): string {
  if (!text) return '';

  let sanitized = text;

  // Remove all PII
  sanitized = redact(sanitized);

  // Remove special characters that might break queries
  sanitized = sanitized.replace(/[<>{}[\]\\]/g, ' ');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength).trim() + '...';
  }

  return sanitized;
}

