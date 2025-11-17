/**
 * Re-export useDebouncedSearch from centralized location
 *
 * This file maintains backward compatibility for imports from FiltersBar/hooks.
 * New code should import directly from lib/debounce.
 */

export { useDebouncedSearch } from '../../../lib/debounce';
