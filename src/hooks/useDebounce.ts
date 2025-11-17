/**
 * Re-export useDebounce from centralized location
 * 
 * This file maintains backward compatibility for imports from hooks/useDebounce.
 * New code should import directly from lib/debounce.
 */

export { useDebounce } from '../lib/debounce';
