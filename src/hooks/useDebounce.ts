import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay = 800, immediate = false): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // If immediate is true, set value immediately on first change
    if (immediate) {
      setDebouncedValue(value);
      return;
    }

    // Otherwise, use standard debounce with 800ms delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, immediate]);

  return debouncedValue;
}
