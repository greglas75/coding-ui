/**
 * Utility Functions
 *
 * Common helper functions used throughout the app.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with proper precedence
 *
 * Combines clsx for conditional classes and tailwind-merge
 * to handle Tailwind class conflicts intelligently.
 *
 * Example:
 * ```tsx
 * cn('px-2 py-1', isActive && 'px-4', 'py-2')
 * // Result: 'px-4 py-2' (later classes override earlier ones)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
