/**
 * Format date for display in table rows
 */
export function formatRowDate(date: string | null): string {
  if (!date) return '—';
  const parsed = new Date(date);
  return parsed.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  });
}

