// ═══════════════════════════════════════════════════════════════
// 🏷️ Code Schema - Validation for code data
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';
import { IdSchema, NonEmptyStringSchema } from './common';

/**
 * Base code schema
 */
export const CodeSchema = z.object({
  id: IdSchema,
  name: NonEmptyStringSchema,
  is_whitelisted: z.boolean(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

/**
 * Code with categories schema
 */
export const CodeWithCategoriesSchema = CodeSchema.extend({
  category_ids: z.array(IdSchema),
});

/**
 * Code with usage count schema
 */
export const CodeWithUsageSchema = CodeSchema.extend({
  usage_count: z.number().int().nonnegative(),
});

/**
 * Create code input schema
 */
export const CreateCodeSchema = z.object({
  name: NonEmptyStringSchema.max(255),
  is_whitelisted: z.boolean().default(false),
  category_ids: z.array(IdSchema).optional(),
});

/**
 * Update code input schema
 */
export const UpdateCodeSchema = z.object({
  name: NonEmptyStringSchema.max(255).optional(),
  is_whitelisted: z.boolean().optional(),
  category_ids: z.array(IdSchema).optional(),
});

// ───────────────────────────────────────────────────────────────
// Type Exports
// ───────────────────────────────────────────────────────────────

export type Code = z.infer<typeof CodeSchema>;
export type CodeWithCategories = z.infer<typeof CodeWithCategoriesSchema>;
export type CodeWithUsage = z.infer<typeof CodeWithUsageSchema>;
export type CreateCodeInput = z.infer<typeof CreateCodeSchema>;
export type UpdateCodeInput = z.infer<typeof UpdateCodeSchema>;

// ───────────────────────────────────────────────────────────────
// Validation Functions
// ───────────────────────────────────────────────────────────────

/**
 * Parse and validate code data
 * @throws {ZodError} if validation fails
 */
export function parseCode(data: unknown): Code {
  return CodeSchema.parse(data);
}

/**
 * Parse and validate array of codes
 * @throws {ZodError} if validation fails
 */
export function parseCodes(data: unknown): Code[] {
  return z.array(CodeSchema).parse(data);
}

/**
 * Parse and validate code with categories
 * @throws {ZodError} if validation fails
 */
export function parseCodeWithCategories(data: unknown): CodeWithCategories {
  return CodeWithCategoriesSchema.parse(data);
}

/**
 * Parse and validate array of codes with categories
 * @throws {ZodError} if validation fails
 */
export function parseCodesWithCategories(data: unknown): CodeWithCategories[] {
  return z.array(CodeWithCategoriesSchema).parse(data);
}

/**
 * Safe parse code - returns success/error result
 */
export function safeParseCode(data: unknown) {
  return CodeSchema.safeParse(data);
}

