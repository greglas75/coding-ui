import { useState } from 'react';
import type { Category } from '../types';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface CategoryWithCount extends Category {
  codes_count: number;
}

interface CategoriesListProps {
  categories: CategoryWithCount[];
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
  const [successAnimation, setSuccessAnimation] = useState<Set<number>>(new Set());

  // 🔧 FIX Bug 4: Add confirmation before delete
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: number; name: string } | null>(null);

  function handleConfirmDelete() {
    if (categoryToDelete) {
      onDeleteCategory(categoryToDelete.id);
      setDeleteModalOpen(false);
      setCategoryToDelete(null);
    }
  }

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchText.toLowerCase())
  );

  function startEditing(category: Category) {
    setEditingId(category.id);
    setTempName(category.name);
  }

  async function saveEdit(categoryId: number) {
    if (!tempName.trim()) return;

    setSaving(true);
    try {
      await onUpdateCategory(categoryId, tempName.trim());
      setEditingId(null);
      setTempName('');

      // Trigger success animation
      setSuccessAnimation(prev => new Set(prev).add(categoryId));
      setTimeout(() => {
        setSuccessAnimation(prev => {
          const newSet = new Set(prev);
          newSet.delete(categoryId);
          return newSet;
        });
      }, 1000);
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setTempName('');
  }

  function formatDate(dateString: string | null | undefined): string {
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
        <div className="hidden md:block">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border-b">
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Name</th>
                <th className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Codes</th>
                <th className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Added</th>
                <th className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Edited</th>
                <th className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category) => (
                <tr
                  key={category.id}
                  className={`group border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer bg-white dark:bg-zinc-900 transition-colors ${
                    selectedCategory?.id === category.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  } ${
                    successAnimation.has(category.id) ? 'animate-pulse bg-green-50 dark:bg-green-900/20' : ''
                  }`}
                  onClick={() => onSelectCategory(category)}
                >
                  {/* Name */}
                  <td className="px-3 py-2">
                    {editingId === category.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(category.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="flex-1 px-2 py-1 text-sm border border-zinc-300 rounded bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            saveEdit(category.id);
                          }}
                          disabled={saving}
                          className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                            cancelEdit();
                          }}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                          title="Cancel"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-medium text-zinc-800 dark:text-zinc-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(category);
                          }}
                        >
                          {category.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (editingId === category.id) {
                              saveEdit(category.id);
                            } else {
                              startEditing(category);
                            }
                          }}
                          disabled={saving}
                          className={`transition p-1 rounded ${
                            editingId === category.id
                              ? 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 bg-green-100 dark:bg-green-900/20 opacity-100'
                              : 'text-zinc-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={editingId === category.id ? "Save changes" : "Edit category name"}
                        >
                          {editingId === category.id ? (
                            saving ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Codes count */}
                  <td className="px-3 py-2 text-center text-zinc-400">
                    {category.codes_count || '—'}
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
                        // 🔧 FIX: Show confirmation instead of immediate delete
                        setCategoryToDelete({ id: category.id, name: category.name });
                        setDeleteModalOpen(true);
                      }}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      title="Delete category"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3 p-4">
          {filteredCategories.map((category) => (
            <div
              key={category.id}
              className={`rounded-xl border p-3 cursor-pointer bg-white dark:bg-zinc-900 transition-colors ${
                selectedCategory?.id === category.id
                  ? 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
                  : 'border-zinc-200 dark:border-zinc-800'
              } ${
                successAnimation.has(category.id) ? 'animate-pulse bg-green-50 dark:bg-green-900/20' : ''
              }`}
              onClick={() => onSelectCategory(category)}
            >
              {/* Name */}
              <div className="mb-2">
                {editingId === category.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(category.id);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="flex-1 px-2 py-1 text-sm border border-zinc-300 rounded bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveEdit(category.id);
                      }}
                      disabled={saving}
                      className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                        cancelEdit();
                      }}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                      title="Cancel"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-medium text-zinc-800 dark:text-zinc-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(category);
                      }}
                    >
                      {category.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (editingId === category.id) {
                          saveEdit(category.id);
                        } else {
                          startEditing(category);
                        }
                      }}
                      disabled={saving}
                      className={`transition p-1 rounded ${
                        editingId === category.id
                          ? 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 bg-green-100 dark:bg-green-900/20'
                          : 'text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={editingId === category.id ? "Save changes" : "Edit category name"}
                    >
                      {editingId === category.id ? (
                        saving ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                <span>Added: {formatDate(category.created_at)}</span>
                <span>Edited: {formatDate(category.updated_at)}</span>
              </div>

              {/* Actions */}
              <div className="flex justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // 🔧 FIX: Show confirmation instead of immediate delete (mobile)
                    setCategoryToDelete({ id: category.id, name: category.name });
                    setDeleteModalOpen(true);
                  }}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                  title="Delete category"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🔧 FIX Bug 4: Confirmation Dialog Before Delete */}
      <ConfirmDeleteModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setCategoryToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Category"
        message="Are you sure you want to delete this category? All associated codes will be unlinked. This action cannot be undone."
        itemName={categoryToDelete?.name || ''}
        loading={false}
      />
    </div>
  );
}
