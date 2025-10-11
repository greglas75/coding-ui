// ═══════════════════════════════════════════════════════════════
// 🔧 Common Zod Schemas - Shared validation schemas
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

/**
 * ISO 8601 datetime string schema
 */
export const DateTimeSchema = z.string().datetime().nullable().optional();

/**
 * ID schema - positive integer
 */
export const IdSchema = z.number().int().positive();

/**
 * Optional ID schema
 */
export const OptionalIdSchema = z.number().int().positive().nullable().optional();

/**
 * Non-empty string schema
 */
export const NonEmptyStringSchema = z.string().min(1);

/**
 * Optional string schema
 */
export const OptionalStringSchema = z.string().nullable().optional();

/**
 * Email schema
 */
export const EmailSchema = z.string().email();

/**
 * URL schema
 */
export const UrlSchema = z.string().url();

/**
 * Pagination schema
 */
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(1000).default(50),
  total: z.number().int().nonnegative().optional(),
});

/**
 * Error response schema
 */
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  code: z.string().optional(),
  details: z.any().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

