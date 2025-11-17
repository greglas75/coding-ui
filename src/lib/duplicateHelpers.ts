/**
 * Duplicate detection utilities
 *
 * Functions for finding duplicate answers in the coding grid.
 */

import type { Answer } from '../types';

/**
 * Find duplicate answer IDs (in-memory version)
 *
 * Finds all answers that match the target answer by category_id and answer_text.
 * Used for client-side filtering of visible answers.
 *
 * @param targetAnswer - The answer to find duplicates for
 * @param allAnswers - Array of all answers to search in
 * @returns Array of duplicate answer IDs (excluding the target answer)
 *
 * @example
 * const duplicates = findDuplicateAnswers(targetAnswer, allAnswers);
 * // [123, 456] - IDs of answers with same text and category
 */
export function findDuplicateAnswers(
  targetAnswer: Answer,
  allAnswers: Answer[]
): number[] {
  const duplicates = allAnswers.filter(answer =>
    answer.category_id === targetAnswer.category_id &&
    answer.answer_text === targetAnswer.answer_text &&
    answer.id !== targetAnswer.id
  );
  return duplicates.map(a => a.id);
}

/**
 * Get total count of duplicate answers (including target)
 *
 * @param targetAnswer - The answer to count duplicates for
 * @param allAnswers - Array of all answers to search in
 * @returns Total count of matching answers (including target)
 *
 * @example
 * const count = getDuplicateCount(targetAnswer, allAnswers);
 * // 5 - including the target answer itself
 */
export function getDuplicateCount(
  targetAnswer: Answer,
  allAnswers: Answer[]
): number {
  return allAnswers.filter(answer =>
    answer.category_id === targetAnswer.category_id &&
    answer.answer_text === targetAnswer.answer_text
  ).length;
}

