// ═══════════════════════════════════════════════════════════════
// 📊 Project Schema - Validation for project data
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';
import { DateTimeSchema, IdSchema, NonEmptyStringSchema, OptionalStringSchema } from './common';

/**
 * Project status enum
 */
export const ProjectStatusSchema = z.enum([
  'active',
  'archived',
  'draft',
  'completed',
]);

/**
 * Project schema
 */
export const ProjectSchema = z.object({
  id: IdSchema,
  name: NonEmptyStringSchema,
  description: OptionalStringSchema,
  status: ProjectStatusSchema,
  created_by: OptionalStringSchema,
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

/**
 * Project with statistics schema
 */
export const ProjectWithStatsSchema = ProjectSchema.extend({
  categories_count: z.number().int().nonnegative(),
  codes_count: z.number().int().nonnegative(),
  answers_count: z.number().int().nonnegative(),
  completed_answers_count: z.number().int().nonnegative(),
  progress_percentage: z.number().min(0).max(100),
});

/**
 * Create project input schema
 */
export const CreateProjectSchema = z.object({
  name: NonEmptyStringSchema.max(255),
  description: z.string().max(1000).optional(),
  status: ProjectStatusSchema.default('draft'),
});

/**
 * Update project input schema
 */
export const UpdateProjectSchema = z.object({
  name: NonEmptyStringSchema.max(255).optional(),
  description: z.string().max(1000).optional(),
  status: ProjectStatusSchema.optional(),
});

// ───────────────────────────────────────────────────────────────
// Type Exports
// ───────────────────────────────────────────────────────────────

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type ProjectWithStats = z.infer<typeof ProjectWithStatsSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

// ───────────────────────────────────────────────────────────────
// Validation Functions
// ───────────────────────────────────────────────────────────────

/**
 * Parse and validate project data
 * @throws {ZodError} if validation fails
 */
export function parseProject(data: unknown): Project {
  return ProjectSchema.parse(data);
}

/**
 * Parse and validate array of projects
 * @throws {ZodError} if validation fails
 */
export function parseProjects(data: unknown): Project[] {
  return z.array(ProjectSchema).parse(data);
}

/**
 * Parse and validate project with stats
 * @throws {ZodError} if validation fails
 */
export function parseProjectWithStats(data: unknown): ProjectWithStats {
  return ProjectWithStatsSchema.parse(data);
}

/**
 * Parse and validate array of projects with stats
 * @throws {ZodError} if validation fails
 */
export function parseProjectsWithStats(data: unknown): ProjectWithStats[] {
  return z.array(ProjectWithStatsSchema).parse(data);
}

/**
 * Safe parse project - returns success/error result
 */
export function safeParseProject(data: unknown) {
  return ProjectSchema.safeParse(data);
}

