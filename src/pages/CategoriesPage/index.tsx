/**
 * CategoriesPage - Main Component
 * Refactored from 795 lines to modular structure
 */

import { FolderOpen, Home } from 'lucide-react';
import { Suspense, lazy, useState } from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import type { Category } from '../../types';
import { useCategories } from './hooks/useCategories';
import { useCategoryActions } from './hooks/useCategoryActions';
import { useCategoryFilters } from './hooks/useCategoryFilters';
import { useCategorySettings } from './hooks/useCategorySettings';
import { CategoriesHeader } from './components/CategoriesHeader';
import { CategoriesTable } from './components/CategoriesTable';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import type { DeleteConfirmState } from './types';

// 🚀 PERFORMANCE: Lazy load heavy modals
const AddCategoryModal = lazy(() =>
  import('../../components/AddCategoryModal').then(m => ({ default: m.AddCategoryModal }))
);
const EditCategoryModal = lazy(() =>
  import('../../components/EditCategoryModal').then(m => ({ default: m.EditCategoryModal }))
);
const CategoryDetails = lazy(() =>
  import('../../components/CategoryDetails').then(m => ({ default: m.CategoryDetails }))
);

export function CategoriesPage() {
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    show: false,
    categoryId: null,
    categoryName: '',
  });

  // Custom hooks
  const { categories, setCategories, loading, error, refetch } = useCategories();
  const { searchText, setSearchText, filteredCategories } = useCategoryFilters(categories);
  const { addCategory, deleteCategory } = useCategoryActions({ categories, setCategories });
  const { saveCategorySettings } = useCategorySettings({
    categories,
    setCategories,
    activeCategory,
    setActiveCategory,
  });

  // Handlers
  function handleSelectCategory(category: Category) {
    setActiveCategory(category);
  }

  function handleDeleteCategory(categoryId: number) {
    const category = categories.find(c => c.id === categoryId);
    setDeleteConfirm({
      show: true,
      categoryId,
      categoryName: category?.name || 'this category',
    });
  }

  async function handleConfirmDelete() {
    if (!deleteConfirm.categoryId) return;

    await deleteCategory(deleteConfirm.categoryId, deleteConfirm.categoryName, () => {
      setDeleteConfirm({ show: false, categoryId: null, categoryName: '' });
      if (activeCategory?.id === deleteConfirm.categoryId) {
        setActiveCategory(null);
      }
    });
  }

  function handleAddCategory(name: string) {
    addCategory(name, () => {
      setModalOpen(false);
    });
  }

  function handleSaveCategorySettings(data: Record<string, unknown>) {
    if (!editingCategory) return;
    saveCategorySettings(editingCategory, data, () => {
      setEditingCategory(null);
    });
  }

  // Build breadcrumbs
  const breadcrumbs: Array<{ label: string; href?: string; icon?: React.ReactNode }> = [
    { label: 'Categories', href: '/', icon: <Home size={14} /> },
  ];

  if (activeCategory) {
    breadcrumbs.push({ label: activeCategory.name });
  }

  if (loading && categories.length === 0)
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="ml-4 text-gray-500 dark:text-gray-400">Loading categories...</p>
        </div>
      </MainLayout>
    );

  if (error)
    return (
      <MainLayout>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400">
          Error: {error}
        </div>
      </MainLayout>
    );

  return (
    <MainLayout
      title={activeCategory ? `${activeCategory.name}` : 'Categories'}
      breadcrumbs={breadcrumbs}
      maxWidth="wide"
    >
      {/* Status message when no category selected */}
      {!activeCategory && categories.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            💡 <strong>Tip:</strong> Select a category from the list below to manage its codes and
            settings
          </p>
        </div>
      )}

      {/* Header */}
      <CategoriesHeader
        activeCategory={activeCategory}
        searchText={searchText}
        onSearchChange={setSearchText}
        onCloseCategory={() => setActiveCategory(null)}
        onReload={refetch}
        onAddCategory={() => setModalOpen(true)}
        loading={loading}
      />

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && categories.length === 0 && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading categories...</p>
        </div>
      )}

      {/* Main Content Area - Split View when Category Selected */}
      {!loading && categories.length > 0 && (
        <div
          className={`grid gap-4 ${activeCategory ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}
        >
          {/* Categories Table */}
          <CategoriesTable
            categories={filteredCategories}
            activeCategory={activeCategory}
            onSelectCategory={handleSelectCategory}
            onEditCategory={setEditingCategory}
            onDeleteCategory={handleDeleteCategory}
          />

          {/* Category Details - Codes List */}
          {activeCategory && (
            <div className="border border-gray-200 dark:border-neutral-700 rounded-md overflow-hidden bg-white dark:bg-neutral-900">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                }
              >
                <CategoryDetails
                  selectedCategory={activeCategory}
                  onCodesChanged={refetch}
                  onEditCategory={setEditingCategory}
                />
              </Suspense>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && categories.length === 0 && !error && (
        <div className="text-center py-12">
          <FolderOpen size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 dark:text-gray-400">No categories found.</p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md"
          >
            Add Your First Category
          </button>
        </div>
      )}

      {/* Modals */}
      <Suspense fallback={null}>
        <AddCategoryModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleAddCategory}
        />
      </Suspense>

      {editingCategory && (
        <Suspense fallback={null}>
          <EditCategoryModal
            category={editingCategory}
            onClose={() => setEditingCategory(null)}
            onSave={handleSaveCategorySettings}
          />
        </Suspense>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmModal
        deleteConfirm={deleteConfirm}
        onCancel={() => setDeleteConfirm({ show: false, categoryId: null, categoryName: '' })}
        onConfirm={handleConfirmDelete}
      />
    </MainLayout>
  );
}

