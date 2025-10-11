// ═══════════════════════════════════════════════════════════════
// 📁 Category Schema - Validation for category data
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';
import { IdSchema, NonEmptyStringSchema } from './common';

/**
 * Category schema
 */
export const CategorySchema = z.object({
  id: IdSchema,
  name: NonEmptyStringSchema,
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

/**
 * Category with statistics schema
 */
export const CategoryWithStatsSchema = CategorySchema.extend({
  whitelisted: z.number().int().nonnegative(),
  blacklisted: z.number().int().nonnegative(),
  gibberish: z.number().int().nonnegative(),
  categorized: z.number().int().nonnegative(),
  notCategorized: z.number().int().nonnegative(),
  global_blacklist: z.number().int().nonnegative(),
  allAnswers: z.number().int().nonnegative(),
});

/**
 * Create category input schema
 */
export const CreateCategorySchema = z.object({
  name: NonEmptyStringSchema.max(255),
});

/**
 * Update category input schema
 */
export const UpdateCategorySchema = z.object({
  name: NonEmptyStringSchema.max(255).optional(),
});

// ───────────────────────────────────────────────────────────────
// Type Exports
// ───────────────────────────────────────────────────────────────

export type Category = z.infer<typeof CategorySchema>;
export type CategoryWithStats = z.infer<typeof CategoryWithStatsSchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;

// ───────────────────────────────────────────────────────────────
// Validation Functions
// ───────────────────────────────────────────────────────────────

/**
 * Parse and validate category data
 * @throws {ZodError} if validation fails
 */
export function parseCategory(data: unknown): Category {
  return CategorySchema.parse(data);
}

/**
 * Parse and validate array of categories
 * @throws {ZodError} if validation fails
 */
export function parseCategories(data: unknown): Category[] {
  return z.array(CategorySchema).parse(data);
}

/**
 * Parse and validate category with stats
 * @throws {ZodError} if validation fails
 */
export function parseCategoryWithStats(data: unknown): CategoryWithStats {
  return CategoryWithStatsSchema.parse(data);
}

/**
 * Parse and validate array of categories with stats
 * @throws {ZodError} if validation fails
 */
export function parseCategoriesWithStats(data: unknown): CategoryWithStats[] {
  return z.array(CategoryWithStatsSchema).parse(data);
}

/**
 * Safe parse category - returns success/error result
 */
export function safeParseCategory(data: unknown) {
  return CategorySchema.safeParse(data);
}

