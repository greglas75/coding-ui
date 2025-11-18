import type { MultiSourceValidationResult } from '../../../../services/multiSourceValidator';

export interface BrandValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: MultiSourceValidationResult;
  userResponse: string;
  translation?: string;
  categoryName: string;

  // Navigation between answers
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalCount?: number;
}

export interface TypeBadge {
  icon: string;
  text: string;
  color: string;
}

export interface ActionBadge {
  text: string;
  color: string;
}

