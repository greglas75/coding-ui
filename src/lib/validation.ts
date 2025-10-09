/**
 * 🔒 SECURITY & VALIDATION LIBRARY
 *
 * Protects the app from:
 * - XSS attacks (Cross-Site Scripting)
 * - Invalid data
 * - Spam/abuse
 * - SQL injection attempts
 *
 * Business Benefits:
 * - Data integrity
 * - Security against attacks
 * - Better UX (clear error messages)
 * - Cost control (rate limiting)
 * - Professional, trustworthy app
 */

import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// 📋 VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

/**
 * Category name validation
 * - Required
 * - 1-100 characters
 * - Only letters, numbers, spaces, hyphens, underscores
 * - Trimmed automatically
 */
export const CategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be less than 100 characters')
    .regex(
      /^[a-zA-Z0-9\s\-_&()]+$/,
      'Category name can only contain letters, numbers, spaces, and basic punctuation'
    )
    .transform((val) => val.trim()),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .transform((val) => val?.trim()),
});

/**
 * Code name validation
 * - Required
 * - 1-50 characters
 * - Only letters, numbers, spaces, hyphens, &
 * - Trimmed automatically
 */
export const CodeSchema = z.object({
  name: z
    .string()
    .min(1, 'Code name is required')
    .max(50, 'Code name must be less than 50 characters')
    .regex(
      /^[a-zA-Z0-9\s\-&()]+$/,
      'Code name can only contain letters, numbers, spaces, hyphens, and &'
    )
    .transform((val) => val.trim()),
  categoryIds: z
    .array(z.number())
    .min(0, 'Categories must be a valid array')
    .max(20, 'Maximum 20 categories allowed'),
});

/**
 * Search query validation
 * - Max 200 characters
 * - Trimmed and sanitized
 */
export const SearchSchema = z.object({
  query: z
    .string()
    .max(200, 'Search query too long (max 200 characters)')
    .transform((val) => val.trim()),
});

/**
 * Answer update validation
 */
export const AnswerUpdateSchema = z.object({
  selectedCode: z
    .string()
    .max(100, 'Code name too long')
    .optional()
    .nullable(),
  generalStatus: z
    .enum(['uncategorized', 'whitelist', 'blacklist', 'categorized', 'global_blacklist'])
    .optional(),
  quickStatus: z
    .enum(['Other', 'Ignore', 'Global Blacklist', 'Blacklist', 'Confirmed'])
    .optional()
    .nullable(),
});

// ═══════════════════════════════════════════════════════════════
// 🧼 SANITIZATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Sanitize HTML from user input to prevent XSS attacks
 *
 * Example:
 * Input:  "<script>alert('hack')</script>Hello"
 * Output: "Hello"
 */
export function sanitizeHTML(dirty: string): string {
  if (!dirty) return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Keep text content
  });
}

/**
 * Sanitize but allow basic formatting (for rich text)
 *
 * Allows: <b>, <i>, <u>, <strong>, <em>, <p>, <br>
 */
export function sanitizeRichText(dirty: string): string {
  if (!dirty) return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
}

/**
 * Validate and sanitize category name
 *
 * Returns:
 * - { success: true, data: "Clean Name" } on success
 * - { success: false, error: "Error message" } on failure
 */
export function validateCategoryName(name: string): {
  success: boolean;
  data?: string;
  error?: string;
} {
  try {
    // First sanitize to remove any HTML
    const sanitized = sanitizeHTML(name);

    // Then validate with schema
    const validated = CategorySchema.shape.name.parse(sanitized);

    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Invalid category name' };
  }
}

/**
 * Validate and sanitize code name
 */
export function validateCodeName(name: string): {
  success: boolean;
  data?: string;
  error?: string;
} {
  try {
    const sanitized = sanitizeHTML(name);
    const validated = CodeSchema.shape.name.parse(sanitized);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Invalid code name' };
  }
}

/**
 * Validate search query
 */
export function validateSearchQuery(query: string): {
  success: boolean;
  data?: string;
  error?: string;
} {
  try {
    const sanitized = sanitizeHTML(query);
    const validated = SearchSchema.shape.query.parse(sanitized);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Invalid search query' };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🚦 RATE LIMITING
// ═══════════════════════════════════════════════════════════════

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

/**
 * Simple client-side rate limiter
 *
 * Prevents spam/abuse by limiting how many times
 * an action can be performed within a time window.
 *
 * Example:
 * - User can only add 10 categories per minute
 * - User can only delete 5 items per minute
 */
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  /**
   * Check if action is allowed under rate limit
   *
   * @param key - Unique identifier for the action (e.g., 'addCategory')
   * @param config - Rate limit configuration
   * @returns true if allowed, false if rate limit exceeded
   */
  check(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get attempts for this key
    let keyAttempts = this.attempts.get(key) || [];

    // Remove old attempts outside the window
    keyAttempts = keyAttempts.filter((timestamp) => timestamp > windowStart);

    // Check if limit exceeded
    if (keyAttempts.length >= config.maxAttempts) {
      console.warn(`⚠️ Rate limit exceeded for: ${key}`);
      return false;
    }

    // Add current attempt
    keyAttempts.push(now);
    this.attempts.set(key, keyAttempts);

    return true;
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string) {
    this.attempts.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clearAll() {
    this.attempts.clear();
  }

  /**
   * Get remaining attempts for a key
   */
  getRemaining(key: string, config: RateLimitConfig): number {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let keyAttempts = this.attempts.get(key) || [];
    keyAttempts = keyAttempts.filter((timestamp) => timestamp > windowStart);

    return Math.max(0, config.maxAttempts - keyAttempts.length);
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Rate limit configurations for different actions
 *
 * Adjust these based on your needs:
 * - Higher limits for frequent actions (search, filter)
 * - Lower limits for expensive actions (delete, auto-confirm)
 */
export const RATE_LIMITS = {
  addCategory: { maxAttempts: 10, windowMs: 60 * 1000 }, // 10 per minute
  addCode: { maxAttempts: 20, windowMs: 60 * 1000 }, // 20 per minute
  editCategory: { maxAttempts: 15, windowMs: 60 * 1000 }, // 15 per minute
  deleteItem: { maxAttempts: 5, windowMs: 60 * 1000 }, // 5 per minute
  autoConfirm: { maxAttempts: 1, windowMs: 5 * 60 * 1000 }, // 1 per 5 minutes
  bulkUpdate: { maxAttempts: 10, windowMs: 60 * 1000 }, // 10 per minute
  search: { maxAttempts: 100, windowMs: 60 * 1000 }, // 100 per minute (generous)
  dryRun: { maxAttempts: 5, windowMs: 60 * 1000 }, // 5 per minute
};

// ═══════════════════════════════════════════════════════════════
// 🛡️ SECURITY HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if string contains potential XSS attempts
 */
export function containsSuspiciousContent(str: string): boolean {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // event handlers like onclick=
    /<iframe/i,
    /eval\(/i,
    /expression\(/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(str));
}

/**
 * Validate email format (basic)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Escape special characters for safe display
 */
export function escapeHTML(str: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return str.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char]);
}

/**
 * Generate user-friendly error message
 */
export function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0].message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Log security event (for monitoring)
 */
export function logSecurityEvent(event: string, details?: Record<string, any>) {
  console.warn(`🔒 Security Event: ${event}`, details);

  // TODO: Send to monitoring service (Sentry, etc.)
  // sentrySDK.captureMessage(event, { level: 'warning', extra: details });
}
