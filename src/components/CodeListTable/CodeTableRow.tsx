import type { FC } from 'react';
import { EditableNameCell } from '../shared/EditableTable/EditableNameCell';
import { EditableCategoriesCell } from './EditableCategoriesCell';

interface Category {
  id: number;
  name: string;
}

interface CodeWithCategories {
  id: number;
  name: string;
  category_ids: number[];
  is_whitelisted: boolean;
  created_at?: string;
  updated_at?: string;
}

interface CodeTableRowProps {
  code: CodeWithCategories;
  categories: Category[];
  usageCount: number;
  isEditing: boolean;
  tempName: string;
  onTempNameChange: (value: string) => void;
  onSaveName: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  saving: boolean;
  hasSuccessAnimation: boolean;
  onToggleWhitelist: (isWhitelisted: boolean) => void;
  onUpdateCategories: (categoryIds: number[]) => void;
  onDelete: () => void;
}

export const CodeTableRow: FC<CodeTableRowProps> = ({
  code,
  categories,
  usageCount,
  isEditing,
  tempName,
  onTempNameChange,
  onSaveName,
  onCancelEdit,
  onStartEdit,
  saving,
  hasSuccessAnimation,
  onToggleWhitelist,
  onUpdateCategories,
  onDelete
}) => {
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '');
  };

  return (
    <tr
      className={`group border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 bg-white dark:bg-zinc-900 transition-colors ${
        hasSuccessAnimation ? 'animate-pulse bg-green-50 dark:bg-green-900/20' : ''
      }`}
    >
      {/* Name */}
      <td className="px-3 py-2">
        <EditableNameCell
          name={code.name}
          isEditing={isEditing}
          tempValue={tempName}
          onTempValueChange={onTempNameChange}
          onSave={onSaveName}
          onCancel={onCancelEdit}
          onStartEdit={onStartEdit}
          saving={saving}
        />
      </td>

      {/* Categories */}
      <td className="px-3 py-2">
        <EditableCategoriesCell
          categoryIds={code.category_ids}
          categories={categories}
          onSave={onUpdateCategories}
        />
      </td>

      {/* Whitelist */}
      <td className="px-3 py-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={code.is_whitelisted}
            onChange={(e) => onToggleWhitelist(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            {code.is_whitelisted ? 'Yes' : 'No'}
          </span>
        </label>
      </td>

      {/* Mentions */}
      <td className="px-3 py-2">
        <div className="flex items-center justify-center">
          {usageCount > 0 ? (
            <span
              className="px-2 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded"
              title={`Used in ${usageCount} answer${usageCount !== 1 ? 's' : ''}`}
            >
              {usageCount}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 text-sm">0</span>
          )}
        </div>
      </td>

      {/* Added */}
      <td className="px-3 py-2">
        <span className="text-[11px] leading-tight text-zinc-500 dark:text-zinc-300 whitespace-nowrap">
          {formatDate(code.created_at)}
        </span>
      </td>

      {/* Edited */}
      <td className="px-3 py-2">
        <span className="text-[11px] leading-tight text-zinc-500 dark:text-zinc-300 whitespace-nowrap">
          {formatDate(code.updated_at)}
        </span>
      </td>

      {/* Actions */}
      <td className="px-3 py-2">
        {usageCount > 0 ? (
          <button
            disabled
            className="px-2 py-1 text-xs bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded cursor-not-allowed"
            title={`Cannot delete: Used in ${usageCount} answer${usageCount !== 1 ? 's' : ''}`}
          >
            Delete
          </button>
        ) : (
          <button
            onClick={onDelete}
            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer transition-colors"
            title="Delete this code"
          >
            Delete
          </button>
        )}
      </td>
    </tr>
  );
};
