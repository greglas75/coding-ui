/**
 * ♿ Focus Management Hooks
 *
 * Provides hooks for managing keyboard focus, essential for accessibility.
 *
 * Benefits:
 * - Focus trap for modals (WCAG 2.4.3)
 * - Auto-focus for forms
 * - Return focus after modal close
 * - Better keyboard navigation UX
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Trap focus within a container (for modals, dropdowns)
 *
 * Prevents Tab key from leaving the container.
 * Essential for accessible modals.
 *
 * Usage:
 * ```tsx
 * function Modal({ open }) {
 *   const modalRef = useFocusTrap(open);
 *   return <div ref={modalRef}>...</div>;
 * }
 * ```
 */
export function useFocusTrap(enabled: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;

    // Save currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Get all focusable elements in container
    const getFocusableElements = () => {
      return container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
    };

    const focusableElements = getFocusableElements();
    const firstElement = focusableElements[0];

    // Focus first element
    firstElement?.focus();

    // Handle Tab key
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      // Refresh focusable elements (in case DOM changed)
      const currentFocusable = getFocusableElements();
      const first = currentFocusable[0];
      const last = currentFocusable[currentFocusable.length - 1];

      if (e.shiftKey) {
        // Shift + Tab (backwards)
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        // Tab (forwards)
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTab);

    // Cleanup: restore focus
    return () => {
      container.removeEventListener('keydown', handleTab);
      if (previousActiveElement.current && document.body.contains(previousActiveElement.current)) {
        previousActiveElement.current.focus();
      }
    };
  }, [enabled]);

  return containerRef;
}

/**
 * Auto-focus element on mount
 *
 * Useful for form inputs in modals.
 *
 * Usage:
 * ```tsx
 * const inputRef = useAutoFocus<HTMLInputElement>();
 * return <input ref={inputRef} />;
 * ```
 */
export function useAutoFocus<T extends HTMLElement>() {
  const elementRef = useRef<T>(null);

  useEffect(() => {
    // Small delay to ensure element is rendered
    const timer = setTimeout(() => {
      elementRef.current?.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return elementRef;
}

/**
 * Return focus to previous element on unmount
 *
 * Useful when closing modals/dropdowns.
 *
 * Usage:
 * ```tsx
 * function Modal() {
 *   useReturnFocus();
 *   return <div>...</div>;
 * }
 * ```
 */
export function useReturnFocus() {
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement;

    return () => {
      if (previousFocus.current && document.body.contains(previousFocus.current)) {
        previousFocus.current.focus();
      }
    };
  }, []);
}

/**
 * Move focus to element by ID
 *
 * Usage:
 * ```tsx
 * const moveFocus = useMoveFocus();
 * moveFocus('error-message'); // Moves focus to element with id="error-message"
 * ```
 */
export function useMoveFocus() {
  return (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
}

/**
 * Keyboard navigation handler for lists/grids
 *
 * Supports Arrow keys, Home, End, PageUp, PageDown.
 *
 * Usage:
 * ```tsx
 * const { focusedIndex, handleKeyDown } = useKeyboardNavigation(items.length);
 * ```
 */
export function useKeyboardNavigation(itemCount: number) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, itemCount - 1));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;

      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;

      case 'End':
        e.preventDefault();
        setFocusedIndex(itemCount - 1);
        break;

      case 'PageDown':
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 10, itemCount - 1));
        break;

      case 'PageUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 10, 0));
        break;
    }
  }, [itemCount]);

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
  };
}
