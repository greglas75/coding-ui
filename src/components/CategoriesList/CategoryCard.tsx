import type { FC } from 'react';
import { EditableNameCell } from '../shared/EditableTable/EditableNameCell';

// CategoryWithCount must match the parent component's definition
interface CategoryWithCount {
  id: number;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
  codes_count: number;
}

interface CategoryCardProps {
  category: CategoryWithCount;
  isSelected: boolean;
  isEditing: boolean;
  tempName: string;
  onTempNameChange: (value: string) => void;
  onSaveName: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  saving: boolean;
  hasSuccessAnimation: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export const CategoryCard: FC<CategoryCardProps> = ({
  category,
  isSelected,
  isEditing,
  tempName,
  onTempNameChange,
  onSaveName,
  onCancelEdit,
  onStartEdit,
  saving,
  hasSuccessAnimation,
  onSelect,
  onDelete
}) => {
  const formatDate = (dateString: string | null | undefined): string => {
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
    <div
      className={`rounded-xl border p-3 mb-3 cursor-pointer bg-white dark:bg-zinc-900 transition-colors ${
        isSelected
          ? 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
          : 'border-zinc-200 dark:border-zinc-800'
      } ${
        hasSuccessAnimation ? 'animate-pulse bg-green-50 dark:bg-green-900/20' : ''
      }`}
      onClick={onSelect}
    >
      {/* Name */}
      <div className="mb-3">
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mb-1">
          Category Name:
        </div>
        <EditableNameCell
          name={category.name}
          isEditing={isEditing}
          tempValue={tempName}
          onTempValueChange={onTempNameChange}
          onSave={onSaveName}
          onCancel={onCancelEdit}
          onStartEdit={onStartEdit}
          saving={saving}
          showEditButton={true}
        />
      </div>

      {/* Codes Count */}
      <div className="mb-3">
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mb-1">
          Codes:
        </div>
        {category.codes_count > 0 ? (
          <span className="px-2 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded">
            {category.codes_count}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 text-sm">0</span>
        )}
      </div>

      {/* Dates */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>Added: {formatDate(category.created_at)}</span>
          <span>Edited: {formatDate(category.updated_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          title="Delete category"
        >
          Delete
        </button>
      </div>
    </div>
  );
};
