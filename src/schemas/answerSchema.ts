// ═══════════════════════════════════════════════════════════════
// 💬 Answer Schema - Validation for answer/segment data
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';
import { DateTimeSchema, IdSchema, OptionalIdSchema, OptionalStringSchema } from './common';

/**
 * General status enum
 */
export const GeneralStatusSchema = z.enum([
  'uncategorized',
  'whitelist',
  'blacklist',
  'categorized',
  'global_blacklist',
  'Other',
  'Ignored',
  'Global Blacklist',
  'Whitelist',
]).nullable();

/**
 * Quick status enum
 */
export const QuickStatusSchema = z.enum([
  'Other',
  'Ignore',
  'Global Blacklist',
  'Blacklist',
  'Confirmed',
]).nullable();

/**
 * AI Code Suggestion schema
 */
export const AiCodeSuggestionSchema = z.object({
  code_id: z.string(),
  code_name: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

/**
 * AI Suggestions schema (complete JSONB structure)
 */
export const AiSuggestionsSchema = z.object({
  suggestions: z.array(AiCodeSuggestionSchema),
  model: z.string(),
  timestamp: z.string(),
  preset_used: z.string(),
}).nullable();

/**
 * Answer/Segment schema
 */
export const AnswerSchema = z.object({
  id: IdSchema,
  answer_text: z.string(),
  translation: OptionalStringSchema,
  translation_en: OptionalStringSchema,
  language: OptionalStringSchema,
  country: OptionalStringSchema,
  quick_status: QuickStatusSchema,
  general_status: GeneralStatusSchema,
  selected_code: OptionalStringSchema,
  ai_suggested_code: OptionalStringSchema,
  ai_suggestions: AiSuggestionsSchema,
  category_id: OptionalIdSchema,
  coding_date: DateTimeSchema,
  confirmed_by: OptionalStringSchema,
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

/**
 * Create answer input schema
 */
export const CreateAnswerSchema = z.object({
  answer_text: z.string().min(1),
  translation: z.string().optional(),
  language: z.string().optional(),
  country: z.string().optional(),
  category_id: IdSchema.optional(),
});

/**
 * Update answer input schema
 */
export const UpdateAnswerSchema = z.object({
  answer_text: z.string().min(1).optional(),
  translation: z.string().optional(),
  quick_status: QuickStatusSchema.optional(),
  general_status: GeneralStatusSchema.optional(),
  selected_code: z.string().optional(),
  ai_suggested_code: z.string().optional(),
  ai_suggestions: AiSuggestionsSchema.optional(),
  category_id: IdSchema.optional(),
  coding_date: z.string().optional(),
  confirmed_by: z.string().optional(),
});

/**
 * Filter answers input schema
 */
export const FilterAnswersSchema = z.object({
  search: z.string().optional(),
  status: z.array(z.string()).optional(),
  codes: z.array(z.string()).optional(),
  language: z.string().optional(),
  country: z.string().optional(),
  categoryId: IdSchema.optional(),
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().positive().optional(),
});

// ───────────────────────────────────────────────────────────────
// Type Exports
// ───────────────────────────────────────────────────────────────

export type Answer = z.infer<typeof AnswerSchema>;
export type AiCodeSuggestion = z.infer<typeof AiCodeSuggestionSchema>;
export type AiSuggestions = z.infer<typeof AiSuggestionsSchema>;
export type GeneralStatus = z.infer<typeof GeneralStatusSchema>;
export type QuickStatus = z.infer<typeof QuickStatusSchema>;
export type CreateAnswerInput = z.infer<typeof CreateAnswerSchema>;
export type UpdateAnswerInput = z.infer<typeof UpdateAnswerSchema>;
export type FilterAnswersInput = z.infer<typeof FilterAnswersSchema>;

// ───────────────────────────────────────────────────────────────
// Validation Functions
// ───────────────────────────────────────────────────────────────

/**
 * Parse and validate answer data
 * @throws {ZodError} if validation fails
 */
export function parseAnswer(data: unknown): Answer {
  return AnswerSchema.parse(data);
}

/**
 * Parse and validate array of answers
 * @throws {ZodError} if validation fails
 */
export function parseAnswers(data: unknown): Answer[] {
  return z.array(AnswerSchema).parse(data);
}

/**
 * Parse and validate AI suggestions
 * @throws {ZodError} if validation fails
 */
export function parseAiSuggestions(data: unknown): AiSuggestions {
  return AiSuggestionsSchema.parse(data);
}

/**
 * Safe parse answer - returns success/error result
 */
export function safeParseAnswer(data: unknown) {
  return AnswerSchema.safeParse(data);
}

// Alias for backward compatibility (Segment = Answer)
export const SegmentSchema = AnswerSchema;
export type Segment = Answer;
export const parseSegment = parseAnswer;
export const parseSegments = parseAnswers;
export const safeParseSegment = safeParseAnswer;

