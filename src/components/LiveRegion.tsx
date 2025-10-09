import { useEffect, useRef } from 'react';

interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive' | 'off';
  clearAfter?: number; // milliseconds
}

export function LiveRegion({
  message,
  politeness = 'polite',
  clearAfter = 5000
}: LiveRegionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!message || !ref.current) return;

    // Set message
    ref.current.textContent = message;

    // Clear after delay
    const timer = setTimeout(() => {
      if (ref.current) {
        ref.current.textContent = '';
      }
    }, clearAfter);

    return () => clearTimeout(timer);
  }, [message, clearAfter]);

  return (
    <div
      ref={ref}
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    />
  );
}
