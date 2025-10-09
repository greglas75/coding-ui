import { useEffect } from 'react';

interface UseKeyboardShortcutsProps {
  selectedCount: number;
  onBulkUpdate: (status: 'whitelist' | 'blacklist' | 'categorized') => void;
}

export function useKeyboardShortcuts({ selectedCount, onBulkUpdate }: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if we have selected items and no input is focused
      if (selectedCount === 0 || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key) {
        case '1':
          event.preventDefault();
          onBulkUpdate('whitelist');
          break;
        case '2':
          event.preventDefault();
          onBulkUpdate('blacklist');
          break;
        case '3':
          event.preventDefault();
          onBulkUpdate('categorized');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCount, onBulkUpdate]);
} 
