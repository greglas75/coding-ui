import type { FC } from 'react';
import { useState } from 'react';

interface Category {
  id: number;
  name: string;
}

interface EditableCategoriesCellProps {
  categoryIds: number[];
  categories: Category[];
  onSave: (categoryIds: number[]) => void;
  onCancel?: () => void;
}

export const EditableCategoriesCell: FC<EditableCategoriesCellProps> = ({
  categoryIds,
  categories,
  onSave,
  onCancel
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempCategories, setTempCategories] = useState<number[]>(categoryIds);

  const toggleCategory = (categoryId: number) => {
    setTempCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSave = () => {
    onSave(tempCategories);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempCategories(categoryIds);
    setIsEditing(false);
    onCancel?.();
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <div className="max-h-32 overflow-y-auto border border-zinc-300 rounded p-2 dark:border-zinc-600">
          {categories.map(category => (
            <label key={category.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={tempCategories.includes(category.id)}
                onChange={() => toggleCategory(category.id)}
                className="w-3 h-3"
              />
              {category.name}
            </label>
          ))}
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="px-2 py-1 text-xs bg-zinc-600 text-white rounded hover:bg-zinc-700"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {categoryIds.length > 0 ? (
        categoryIds.map(categoryId => {
          const category = categories.find(c => c.id === categoryId);
          return category ? (
            <span
              key={categoryId}
              className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md dark:bg-blue-900/20 dark:text-blue-300"
            >
              {category.name}
            </span>
          ) : null;
        })
      ) : (
        <span className="text-zinc-500 dark:text-zinc-400 text-sm">—</span>
      )}
      <button
        onClick={() => setIsEditing(true)}
        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        Edit
      </button>
    </div>
  );
};
