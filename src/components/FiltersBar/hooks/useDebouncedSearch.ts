import { useCallback, useEffect, useState } from 'react';

/**
 * Hook dla debounced search input
 */
export function useDebouncedSearch(
  initialValue: string,
  delay: number = 300
): [string, string, (value: string) => void] {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);

  return [value, debouncedValue, handleChange];
}
