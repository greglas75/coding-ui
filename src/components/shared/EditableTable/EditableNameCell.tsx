import type { FC } from 'react';

interface EditableNameCellProps {
  name: string;
  isEditing: boolean;
  tempValue: string;
  onTempValueChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
  saving: boolean;
  showEditButton?: boolean;
}

export const EditableNameCell: FC<EditableNameCellProps> = ({
  name,
  isEditing,
  tempValue,
  onTempValueChange,
  onSave,
  onCancel,
  onStartEdit,
  saving,
  showEditButton = true
}) => {
  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={tempValue}
          onChange={(e) => onTempValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave();
            if (e.key === 'Escape') onCancel();
          }}
          className="flex-1 px-2 py-1 text-sm border border-zinc-300 rounded bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          disabled={saving}
          className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Save changes"
        >
          {saving ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
          title="Cancel"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onStartEdit();
        }}
        className="text-sm font-medium text-zinc-800 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 text-left flex-1 cursor-pointer"
      >
        {name}
      </button>
      {showEditButton && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit();
          }}
          className="text-zinc-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
          title="Edit name"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}
    </div>
  );
};
