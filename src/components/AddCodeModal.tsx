import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Category } from '../types';

interface AddCodeModalProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onSave: (name: string, categoryIds: number[]) => void;
}

export function AddCodeModal({ open, onClose, categories, onSave }: AddCodeModalProps) {
  const [name, setName] = useState('');
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);

  // Debug: log categories when modal opens
  console.log('AddCodeModal - categories:', categories);

  // Filter categories based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCategories(categories);
    } else {
      const filtered = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCategories(filtered);
    }
  }, [searchTerm, categories]);

  // 🔧 FIX: Close modal with ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !loading) {
        handleClose();
      }
    };

    if (open) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [open, loading]);

  function handleSave() {
    if (!name.trim()) {
      setError('Code name is required');
      return;
    }

    setLoading(true);
    setError(null);

    onSave(name.trim(), categoryIds);

    // Show success toast
    toast.success('Code added successfully!', {
      style: { background: '#1f2937', color: '#fff' },
    });

    // Reset form
    setName('');
    setCategoryIds([]);
    setLoading(false);
  }

  function handleClose() {
    if (!loading) {
      setName('');
      setCategoryIds([]);
      setSearchTerm('');
      setError(null);
      onClose();
    }
  }

  function toggleCategory(categoryId: number) {
    setCategoryIds(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Add New Code</h2>
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
        >
          &times;
        </button>

        {error && (
          <div className="bg-red-100 text-red-800 p-2 rounded mb-4 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Code Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter code name..."
            className="w-full px-3 py-2 border border-zinc-300 rounded-md bg-white text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
          />
        </div>

        {/* Categories */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Categories
          </label>

          {/* Search input */}
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-md bg-white text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400 mb-2"
          />

          <div className="max-h-32 overflow-y-auto border border-zinc-300 rounded p-2 dark:border-zinc-600">
            {categories.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No categories available — please add a category first.
              </p>
            ) : filteredCategories.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No matching categories
              </p>
            ) : (
              filteredCategories.map(category => (
                <label key={category.id} className="flex items-center gap-2 text-sm mb-1 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 p-1 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={categoryIds.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                    className="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600 cursor-pointer"
                  />
                  <span className="cursor-pointer">{category.name}</span>
                </label>
              ))
            )}
          </div>
        </div>


        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={loading || !name.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-zinc-200 text-zinc-800 rounded-md hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
