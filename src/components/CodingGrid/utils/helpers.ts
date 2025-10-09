import type { Answer } from '../../../types';

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(',', '');
}

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

export function getDuplicateCount(
  targetAnswer: Answer,
  allAnswers: Answer[]
): number {
  return allAnswers.filter(answer =>
    answer.category_id === targetAnswer.category_id &&
    answer.answer_text === targetAnswer.answer_text
  ).length;
}
