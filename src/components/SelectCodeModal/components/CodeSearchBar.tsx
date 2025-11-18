/**
 * Code Search Bar Component
 */

import { Search } from 'lucide-react';
import type { Code } from '../../../types';

interface CodeSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onFocus: () => void;
}

export function CodeSearchBar({ searchTerm, onSearchChange, onFocus }: CodeSearchBarProps) {
  return (
    <div className="mb-3 flex-shrink-0">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Type to search codes..."
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          onFocus={onFocus}
          className="w-full rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
        />
      </div>
    </div>
  );
}

