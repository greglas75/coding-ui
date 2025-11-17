/**
 * Date formatting utilities
 *
 * Centralized date formatting functions used throughout the app.
 */

/**
 * Format a date string to a readable format (YYYY-MM-DD HH:MM)
 *
 * @param dateString - ISO date string or null/undefined
 * @returns Formatted date string or '—' if invalid
 *
 * @example
 * formatDate('2025-01-11T10:30:00Z') // '2025-01-11 10:30'
 * formatDate(null) // '—'
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(',', '');
}

