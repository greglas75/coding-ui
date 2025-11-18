import type { MultiSourceValidationResult } from '../../../../../services/multiSourceValidator';
import type { TypeBadge, ActionBadge } from '../types';

/**
 * Get validation type badge configuration
 */
export function getTypeBadge(result: MultiSourceValidationResult): TypeBadge {
  const badges: Record<string, TypeBadge> = {
    global_code: {
      icon: '🌐',
      text: 'Global Code',
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    },
    brand_match: {
      icon: '✅',
      text: 'Brand Match',
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    },
    category_error: {
      icon: '❌',
      text: 'Category Error',
      color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
    },
    ambiguous_descriptor: {
      icon: '⚠️',
      text: 'Ambiguous',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
    },
    clear_match: {
      icon: '🎯',
      text: 'Clear Match',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
    },
    unclear: {
      icon: '❓',
      text: 'Unclear',
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    },
  };
  return badges[result.type] || badges.unclear;
}

/**
 * Get UI action badge configuration
 */
export function getActionBadge(result: MultiSourceValidationResult): ActionBadge {
  const actions: Record<string, ActionBadge> = {
    approve: {
      text: 'Auto-Approve',
      color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
    },
    ask_user_choose: {
      text: 'Disambiguation Needed',
      color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
    },
    review_category: {
      text: 'Category Review',
      color: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
    },
    manual_review: {
      text: 'Manual Review',
      color: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    },
  };
  return actions[result.ui_action] || actions.manual_review;
}

