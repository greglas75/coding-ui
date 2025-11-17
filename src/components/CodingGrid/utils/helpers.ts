/**
 * Re-export utilities from centralized locations
 *
 * This file maintains backward compatibility for imports from this path.
 * New code should import directly from lib/dateUtils and lib/duplicateHelpers.
 */

export { formatDate } from '../../../lib/dateUtils';
export { findDuplicateAnswers, getDuplicateCount } from '../../../lib/duplicateHelpers';
