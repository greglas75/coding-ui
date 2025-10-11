// ═══════════════════════════════════════════════════════════════
// 📦 Import Package Schema - Validation for data import packages
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';
import { DateTimeSchema, IdSchema, NonEmptyStringSchema, OptionalIdSchema, OptionalStringSchema } from './common';

/**
 * Import status enum
 */
export const ImportStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
]);

/**
 * Import file type enum
 */
export const ImportFileTypeSchema = z.enum([
  'csv',
  'xlsx',
  'xls',
  'json',
]);

/**
 * Import statistics schema
 */
export const ImportStatsSchema = z.object({
  total_rows: z.number().int().nonnegative(),
  imported: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  duplicates: z.number().int().nonnegative(),
});

/**
 * Import error schema
 */
export const ImportErrorSchema = z.object({
  row_number: z.number().int().positive(),
  error_message: z.string(),
  row_data: z.any().optional(),
});

/**
 * Import package schema
 */
export const ImportPackageSchema = z.object({
  id: IdSchema,
  name: NonEmptyStringSchema,
  description: OptionalStringSchema,
  file_name: NonEmptyStringSchema,
  file_type: ImportFileTypeSchema,
  file_size: z.number().int().positive(),
  category_id: OptionalIdSchema,
  status: ImportStatusSchema,
  stats: ImportStatsSchema.nullable().optional(),
  errors: z.array(ImportErrorSchema).nullable().optional(),
  started_at: DateTimeSchema,
  completed_at: DateTimeSchema,
  created_by: OptionalStringSchema,
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

/**
 * Import package with details schema
 */
export const ImportPackageWithDetailsSchema = ImportPackageSchema.extend({
  preview_data: z.array(z.record(z.string(), z.any())).optional(),
  validation_warnings: z.array(z.string()).optional(),
});

/**
 * Create import package input schema
 */
export const CreateImportPackageSchema = z.object({
  name: NonEmptyStringSchema.max(255),
  description: z.string().max(1000).optional(),
  file_name: NonEmptyStringSchema.max(255),
  file_type: ImportFileTypeSchema,
  file_size: z.number().int().positive(),
  category_id: IdSchema.optional(),
});

/**
 * Update import package input schema
 */
export const UpdateImportPackageSchema = z.object({
  name: NonEmptyStringSchema.max(255).optional(),
  description: z.string().max(1000).optional(),
  status: ImportStatusSchema.optional(),
  stats: ImportStatsSchema.optional(),
  errors: z.array(ImportErrorSchema).optional(),
  completed_at: z.string().optional(),
});

/**
 * File upload response schema
 */
export const FileUploadResponseSchema = z.object({
  status: z.enum(['success', 'error']),
  imported: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  totalErrors: z.number().int().nonnegative().optional(),
  errors: z.array(z.string()).optional(),
  error: z.string().optional(),
});

// ───────────────────────────────────────────────────────────────
// Type Exports
// ───────────────────────────────────────────────────────────────

export type ImportPackage = z.infer<typeof ImportPackageSchema>;
export type ImportPackageWithDetails = z.infer<typeof ImportPackageWithDetailsSchema>;
export type ImportStatus = z.infer<typeof ImportStatusSchema>;
export type ImportFileType = z.infer<typeof ImportFileTypeSchema>;
export type ImportStats = z.infer<typeof ImportStatsSchema>;
export type ImportError = z.infer<typeof ImportErrorSchema>;
export type CreateImportPackageInput = z.infer<typeof CreateImportPackageSchema>;
export type UpdateImportPackageInput = z.infer<typeof UpdateImportPackageSchema>;
export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;

// ───────────────────────────────────────────────────────────────
// Validation Functions
// ───────────────────────────────────────────────────────────────

/**
 * Parse and validate import package data
 * @throws {ZodError} if validation fails
 */
export function parseImportPackage(data: unknown): ImportPackage {
  return ImportPackageSchema.parse(data);
}

/**
 * Parse and validate array of import packages
 * @throws {ZodError} if validation fails
 */
export function parseImportPackages(data: unknown): ImportPackage[] {
  return z.array(ImportPackageSchema).parse(data);
}

/**
 * Parse and validate import package with details
 * @throws {ZodError} if validation fails
 */
export function parseImportPackageWithDetails(data: unknown): ImportPackageWithDetails {
  return ImportPackageWithDetailsSchema.parse(data);
}

/**
 * Parse and validate file upload response
 * @throws {ZodError} if validation fails
 */
export function parseFileUploadResponse(data: unknown): FileUploadResponse {
  return FileUploadResponseSchema.parse(data);
}

/**
 * Safe parse import package - returns success/error result
 */
export function safeParseImportPackage(data: unknown) {
  return ImportPackageSchema.safeParse(data);
}

