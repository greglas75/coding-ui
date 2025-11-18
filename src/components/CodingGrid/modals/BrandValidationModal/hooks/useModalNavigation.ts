import { useEffect } from 'react';

interface UseModalNavigationProps {
  isOpen: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

/**
 * Hook for handling modal keyboard navigation (ESC, arrow keys)
 * and auto-scrolling to top when opened
 */
export function useModalNavigation({
  isOpen,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: UseModalNavigationProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      // Arrow keys for navigation
      if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) {
        onPrevious();
      }
      if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext();
      }
    };

    document.addEventListener('keydown', handleEscape);

    // Auto-scroll modal content to top when opened
    const modalContent = document.querySelector('.brand-validation-modal-content');
    if (modalContent) {
      modalContent.scrollTop = 0;
    }

    // Cleanup function always runs when effect re-runs or component unmounts
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, onPrevious, onNext, hasPrevious, hasNext]);
}

