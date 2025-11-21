import { useCallback, useState } from 'react';

/**
 * Reusable modal state management hook
 *
 * @param initialOpen - Initial modal state (default: false)
 * @returns Object with modal state and control functions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const modal = useModal();
 *
 *   return (
 *     <>
 *       <button onClick={modal.open}>Open Modal</button>
 *       {modal.isOpen && (
 *         <MyModal onClose={modal.close} />
 *       )}
 *     </>
 *   );
 * }
 * ```
 *
 * @example With initial state
 * ```tsx
 * const modal = useModal(true); // Opens modal by default
 * ```
 */
export function useModal(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen, // For advanced use cases
  };
}

/**
 * Reusable modal state management hook with data payload
 *
 * Useful when you need to pass data to the modal (e.g., editing an item)
 *
 * @param initialData - Initial data (default: null)
 * @returns Object with modal state, data, and control functions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const modal = useModalWithData<User>();
 *
 *   return (
 *     <>
 *       <button onClick={() => modal.open({ id: 1, name: 'John' })}>
 *         Edit User
 *       </button>
 *       {modal.isOpen && modal.data && (
 *         <EditUserModal user={modal.data} onClose={modal.close} />
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export function useModalWithData<T = unknown>(initialData: T | null = null) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T | null>(initialData);

  const open = useCallback((payload?: T) => {
    if (payload !== undefined) {
      setData(payload);
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Don't clear data immediately to allow for exit animations
  }, []);

  const closeAndClear = useCallback(() => {
    setIsOpen(false);
    setData(null);
  }, []);

  return {
    isOpen,
    data,
    open,
    close,
    closeAndClear,
    setData,
  };
}
