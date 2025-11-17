/**
 * Debounce utilities
 *
 * Centralized debounce functions used throughout the app.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Debounce a function call
 *
 * @param func - Function to debounce
 * @param wait - Delay in milliseconds
 * @returns Debounced function with cancel method
 *
 * @example
 * const debouncedSearch = debounce((query) => {
 *   console.log('Searching:', query);
 * }, 300);
 *
 * debouncedSearch('test'); // Will execute after 300ms
 * debouncedSearch.cancel(); // Cancel pending execution
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | undefined;

  const debounced = function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  } as T & { cancel: () => void };

  debounced.cancel = () => {
    clearTimeout(timeoutId);
  };

  return debounced;
}

/**
 * Debounce a callback function (React hook version)
 *
 * @param callback - Callback function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced callback with cancel method
 *
 * @example
 * const debouncedSave = useDebouncedCallback((data) => {
 *   saveToServer(data);
 * }, 500);
 *
 * debouncedSave(formData);
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T & { cancel: () => void } {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as T & { cancel: () => void };

  debouncedCallback.cancel = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  return debouncedCallback;
}

/**
 * Debounce a value (React hook)
 *
 * Returns the debounced value after the specified delay.
 *
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds (default: 800)
 * @param immediate - If true, set value immediately on first change (default: false)
 * @returns Debounced value
 *
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 300);
 *
 * // debouncedSearch will update 300ms after search stops changing
 */
export function useDebounce<T>(value: T, delay = 800, immediate = false): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // If immediate is true, set value immediately on first change
    if (immediate) {
      setDebouncedValue(value);
      return;
    }

    // Otherwise, use standard debounce with delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, immediate]);

  return debouncedValue;
}

/**
 * Debounced search hook
 *
 * Returns both the current value and debounced value, plus a setter.
 * Useful for search inputs where you want immediate UI feedback but debounced API calls.
 *
 * @param initialValue - Initial search value
 * @param delay - Delay in milliseconds (default: 300)
 * @returns Tuple of [currentValue, debouncedValue, setValue]
 *
 * @example
 * const [search, debouncedSearch, setSearch] = useDebouncedSearch('', 300);
 *
 * <input value={search} onChange={(e) => setSearch(e.target.value)} />
 * // debouncedSearch updates 300ms after typing stops
 */
export function useDebouncedSearch(
  initialValue: string,
  delay: number = 300
): [string, string, (value: string) => void] {
  const [value, setValue] = useState(initialValue);
  const debouncedValue = useDebounce(value, delay);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);

  return [value, debouncedValue, handleChange];
}
