import { Menu } from '@headlessui/react';
import { Settings } from 'lucide-react';

interface ViewOptionsMenuProps {
  density: 'comfortable' | 'compact';
  onDensityChange: (density: 'comfortable' | 'compact') => void;
}

export function ViewOptionsMenu({ density, onDensityChange }: ViewOptionsMenuProps) {
  return (
    <Menu as="div" className="relative">
      <Menu.Button
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors focus:ring-2 focus:ring-blue-500 outline-none"
        title="View options"
      >
        <Settings size={16} />
        <span className="hidden sm:inline">View Options</span>
      </Menu.Button>

      <Menu.Items className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-md shadow-lg text-sm z-50 py-1">
        <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-neutral-700">
          Display Density
        </div>
        <Menu.Item>
          {({ active }) => (
            <button
              className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2 ${
                active ? 'bg-gray-100 dark:bg-neutral-800' : ''
              } ${
                density === 'comfortable'
                  ? 'text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => onDensityChange('comfortable')}
              title="More spacing between rows"
            >
              {density === 'comfortable' && '✓ '}Comfortable
            </button>
          )}
        </Menu.Item>
        <Menu.Item>
          {({ active }) => (
            <button
              className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2 ${
                active ? 'bg-gray-100 dark:bg-neutral-800' : ''
              } ${
                density === 'compact'
                  ? 'text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => onDensityChange('compact')}
              title="Less spacing, more data visible"
            >
              {density === 'compact' && '✓ '}Compact
            </button>
          )}
        </Menu.Item>
      </Menu.Items>
    </Menu>
  );
}

