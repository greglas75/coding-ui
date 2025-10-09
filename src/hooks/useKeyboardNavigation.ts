import { useCallback, useEffect } from 'react';

interface KeyboardNavigationOptions {
  onEnter?: () => void;
  onSpace?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  enabled?: boolean;
}

export function useKeyboardNavigation(options: KeyboardNavigationOptions) {
  const {
    onEnter,
    onSpace,
    onEscape,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    enabled = true
  } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    switch (event.key) {
      case 'Enter':
        onEnter?.();
        break;
      case ' ':
      case 'Spacebar': // IE11
        event.preventDefault(); // Prevent page scroll
        onSpace?.();
        break;
      case 'Escape':
      case 'Esc': // IE11
        onEscape?.();
        break;
      case 'ArrowUp':
      case 'Up': // IE11
        event.preventDefault();
        onArrowUp?.();
        break;
      case 'ArrowDown':
      case 'Down': // IE11
        event.preventDefault();
        onArrowDown?.();
        break;
      case 'ArrowLeft':
      case 'Left': // IE11
        onArrowLeft?.();
        break;
      case 'ArrowRight':
      case 'Right': // IE11
        onArrowRight?.();
        break;
    }
  }, [enabled, onEnter, onSpace, onEscape, onArrowUp, onArrowDown, onArrowLeft, onArrowRight]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
