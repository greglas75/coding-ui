import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabase';
import type { Category } from '../../types';
import { simpleLogger } from '../../utils/logger';
import { CategoryCard } from './CategoryCard';
import { CategoryTableRow } from './CategoryTableRow';

const supabase = getSupabaseClient();

interface CategoryWithCount extends Category {
  codes_count: number;
}

interface CategoriesListProps {
  categories: Category[];
  selectedCategory: Category | null;
  onSelectCategory: (category: Category) => void;
  onAddCategory: () => void;
  onUpdateCategory: (id: number, name: string) => void;
  onDeleteCategory: (id: number) => void;
}

export function CategoriesList({
  categories,
  selectedCategory,
  onSelectCategory,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory
}: CategoriesListProps) {
  const [searchText, setSearchText] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tempName, setTempName] = useState('');
  const [saving, setSaving] = useState(false);
  const [successAnimationId, setSuccessAnimationId] = useState<number | null>(null);
  const [categoriesWithCount, setCategoriesWithCount] = useState<CategoryWithCount[]>([]);

  // Fetch codes count for all categories
  useEffect(() => {
    async function fetchCodesCounts() {
      try {
        const { data, error } = await supabase
          .from('codes_categories')
          .select('category_id');

        if (error) {
          simpleLogger.error('Error fetching codes counts:', error);
          return;
        }

        // Count codes per category
        const countsMap = new Map<number, number>();
        data?.forEach((row) => {
          const count = countsMap.get(row.category_id) || 0;
          countsMap.set(row.category_id, count + 1);
        });

        // Merge counts with categories
        const withCounts: CategoryWithCount[] = categories.map((cat) => ({
          ...cat,
          codes_count: countsMap.get(cat.id) || 0,
        }));

        setCategoriesWithCount(withCounts);
      } catch (error) {
        simpleLogger.error('Error fetching codes counts:', error);
        // Fallback: set all counts to 0
        setCategoriesWithCount(
          categories.map((cat) => ({ ...cat, codes_count: 0 }))
        );
      }
    }

    fetchCodesCounts();
  }, [categories]);

  // Filter categories by search text
  const filteredCategories = categoriesWithCount.filter((category) =>
    category.name.toLowerCase().includes(searchText.toLowerCase())
  );

  function startEditing(categoryId: number, currentName: string) {
    setEditingId(categoryId);
    setTempName(currentName);
  }

  async function saveEdit(categoryId: number) {
    if (!tempName.trim()) {
      cancelEdit();
      return;
    }

    setSaving(true);
    await onUpdateCategory(categoryId, tempName.trim());
    setSaving(false);
    setEditingId(null);
    setTempName('');

    // Show success animation
    setSuccessAnimationId(categoryId);
    setTimeout(() => setSuccessAnimationId(null), 1000);
  }

  function cancelEdit() {
    setEditingId(null);
    setTempName('');
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-3 items-center">
          <input
            type="text"
            placeholder="Search categories..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="flex-1 px-3 py-2 border border-zinc-300 rounded-md bg-white text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
          />
          <button
            onClick={onAddCategory}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-zinc-800"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Categories List */}
      <div className="flex-1 overflow-auto">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border-b">
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Name
                </th>
                <th className="text-center px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Codes
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Added
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Edited
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category) => (
                <CategoryTableRow
                  key={category.id}
                  category={category}
                  isSelected={selectedCategory?.id === category.id}
                  isEditing={editingId === category.id}
                  tempName={tempName}
                  onTempNameChange={setTempName}
                  onSaveName={() => saveEdit(category.id)}
                  onCancelEdit={cancelEdit}
                  onStartEdit={() => startEditing(category.id, category.name)}
                  saving={saving && editingId === category.id}
                  hasSuccessAnimation={successAnimationId === category.id}
                  onSelect={() => onSelectCategory(category)}
                  onDelete={() => onDeleteCategory(category.id)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3 p-4">
          {filteredCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              isSelected={selectedCategory?.id === category.id}
              isEditing={editingId === category.id}
              tempName={tempName}
              onTempNameChange={setTempName}
              onSaveName={() => saveEdit(category.id)}
              onCancelEdit={cancelEdit}
              onStartEdit={() => startEditing(category.id, category.name)}
              saving={saving && editingId === category.id}
              hasSuccessAnimation={successAnimationId === category.id}
              onSelect={() => onSelectCategory(category)}
              onDelete={() => onDeleteCategory(category.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

