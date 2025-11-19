import type { Answer } from '../../types';
import type { FiltersState } from '../../hooks/useFilters';

export interface CodingGridProps {
  answers: Answer[];
  totalAnswers?: number;
  density: 'comfortable' | 'compact';
  setDensity: (density: 'comfortable' | 'compact') => void;
  currentCategoryId?: number;
  onCodingStart?: (categoryId: number | undefined) => void;
  onFiltersChange?: (filters: FiltersState) => void;
}

export interface LocalAnswer extends Answer {
  // Add local-only fields if needed (currently none)
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
