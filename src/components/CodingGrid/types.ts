import type { Answer } from '../../types';

export interface CodingGridProps {
  answers: Answer[];
  totalAnswers?: number;
  density: 'comfortable' | 'compact';
  setDensity: (density: 'comfortable' | 'compact') => void;
  currentCategoryId?: number;
  onCodingStart?: (categoryId: number | undefined) => void;
  onFiltersChange?: (filters: any) => void;
}

export interface LocalAnswer extends Answer {
  // Add any local-only fields if needed
}

export interface FilterOptions {
  types: string[];
  statuses: string[];
  languages: string[];
  countries: string[];
  brands: string[];
}

export interface RowAnimations {
  [key: number]: string;
}
