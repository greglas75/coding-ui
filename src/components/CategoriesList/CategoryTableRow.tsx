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

interface CategoryTableRowProps {
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

export const CategoryTableRow: FC<CategoryTableRowProps> = ({
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
    <tr
      className={`group border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 bg-white dark:bg-zinc-900 transition-colors cursor-pointer ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      } ${
        hasSuccessAnimation ? 'animate-pulse bg-green-50 dark:bg-green-900/20' : ''
      }`}
      onClick={onSelect}
    >
      {/* Name */}
      <td className="px-3 py-2">
        <EditableNameCell
          name={category.name}
          isEditing={isEditing}
          tempValue={tempName}
          onTempValueChange={onTempNameChange}
          onSave={onSaveName}
          onCancel={onCancelEdit}
          onStartEdit={onStartEdit}
          saving={saving}
        />
      </td>

      {/* Codes Count */}
      <td className="px-3 py-2 text-center">
        <span className="text-sm text-zinc-700 dark:text-zinc-300">
          {category.codes_count}
        </span>
      </td>

      {/* Added */}
      <td className="px-3 py-2">
        <span className="text-[11px] leading-tight text-zinc-500 dark:text-zinc-300 whitespace-nowrap">
          {formatDate(category.created_at)}
        </span>
      </td>

      {/* Edited */}
      <td className="px-3 py-2">
        <span className="text-[11px] leading-tight text-zinc-500 dark:text-zinc-300 whitespace-nowrap">
          {formatDate(category.updated_at)}
        </span>
      </td>

      {/* Actions */}
      <td className="px-3 py-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer transition-colors"
          title="Delete this category"
        >
          Delete
        </button>
      </td>
    </tr>
  );
};
