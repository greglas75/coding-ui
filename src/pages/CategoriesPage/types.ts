/**
 * Types for CategoriesPage
 */

import type { Category } from '../../types';

export interface CategoryWithStats extends Category {
  whitelisted: number;
  blacklisted: number;
  gibberish: number;
  categorized: number;
  notCategorized: number;
  global_blacklist: number;
  allAnswers: number;
}

export interface DeleteConfirmState {
  show: boolean;
  categoryId: number | null;
  categoryName: string;
}

