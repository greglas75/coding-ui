/**
 * Code List Component
 */

import type { Code } from '../../../types';

interface CodeListProps {
  codes: Code[];
  selectedCodes: string[];
  searchTerm: string;
  onToggleCode: (codeName: string) => void;
}

export function CodeList({ codes, selectedCodes, searchTerm, onToggleCode }: CodeListProps) {
  const filteredCodes = codes.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="overflow-y-auto max-h-[400px] space-y-1 flex-1 pr-2">
      {filteredCodes.map(code => (
        <label
          key={code.id}
          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
        >
          <input
            type="checkbox"
            checked={selectedCodes.includes(code.name)}
            onChange={() => onToggleCode(code.name)}
            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-800 dark:text-gray-100">{code.name}</span>
        </label>
      ))}
      {filteredCodes.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No codes found matching your search' : 'No codes available'}
          </p>
        </div>
      )}
    </div>
  );
}

