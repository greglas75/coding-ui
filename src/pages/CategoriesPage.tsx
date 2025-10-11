import { Code2, FolderOpen, Home, Plus, RefreshCw, Search, Settings, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AddCategoryModal } from '../components/AddCategoryModal';
import { CategoryDetails } from '../components/CategoryDetails';
import { EditCategoryModal } from '../components/EditCategoryModal';
import { MainLayout } from '../components/layout/MainLayout';
import { optimisticArrayUpdate } from '../lib/optimisticUpdate';
import { supabase } from '../lib/supabase';
import type { Category } from '../types';

interface CategoryWithStats extends Category {
  whitelisted: number;
  blacklisted: number;
  gibberish: number;
  categorized: number;
  notCategorized: number;
  global_blacklist: number;
  allAnswers: number;
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchText, setSearchText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    categoryId: number | null;
    categoryName: string;
  }>({
    show: false,
    categoryId: null,
    categoryName: '',
  });


  // Fetch categories with statistics
  async function fetchCategories() {
    try {
      console.log('Fetching categories with statistics...');
      setLoading(true);

      // Get categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
        setError(`Failed to fetch categories: ${categoriesError.message}`);
        setLoading(false);
        return;
      }

      if (!categoriesData) {
        setCategories([]);
        setLoading(false);
        return;
      }

      // Note: codes_count removed as per requirements

      // Get statistics for all categories via RPC (single query, no N+1)
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_category_stats');

      if (statsError) {
        console.error('Error fetching category stats via RPC:', statsError);
      }

      const statsMap = new Map<number, any>((statsData || []).map((s: any) => [s.category_id, s]));

      const categoriesWithStats: CategoryWithStats[] = (categoriesData || []).map((cat) => {
        const s = statsMap.get(cat.id) || {};
        const allAnswers = Number(s.whitelisted || 0) + Number(s.blacklisted || 0) + Number(s.gibberish || 0) + Number(s.categorized || 0) + Number(s.not_categorized || 0) + Number(s.global_blacklist || 0);
        return {
          ...cat,
          whitelisted: Number(s.whitelisted || 0),
          blacklisted: Number(s.blacklisted || 0),
          gibberish: Number(s.gibberish || 0),
          categorized: Number(s.categorized || 0),
          notCategorized: Number(s.not_categorized || 0),
          global_blacklist: Number(s.global_blacklist || 0),
          allAnswers: allAnswers
        };
      });

      setCategories(categoriesWithStats);
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchCategories:', error);
      setError('Failed to fetch categories');
      setLoading(false);
    }
  }


  // Initial load
  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // First, test if categories table exists
      console.log('Testing categories table...');
      const { data: testData, error: testError } = await supabase
        .from('categories')
        .select('count')
        .limit(1);

      console.log('Table test result:', { testData, testError });

      if (testError) {
        console.error('Categories table test failed:', testError);
        setError(`Categories table not found. Please run the SQL migration: ${testError.message}`);
        setLoading(false);
        return;
      }

      await fetchCategories();
      setLoading(false);
    }
    loadData();
  }, []);


  // Add new category (with optimistic updates!)
  async function addCategory(name: string) {
    // Generate temporary ID
    const tempId = -Date.now();
    const tempCategory: CategoryWithStats = {
      id: tempId,
      name,
      created_at: new Date().toISOString(),
      whitelisted: 0,
      blacklisted: 0,
      gibberish: 0,
      categorized: 0,
      notCategorized: 0,
      global_blacklist: 0,
      allAnswers: 0
    };

    try {
      await optimisticArrayUpdate(
        categories,
        setCategories,
        'add',
        tempCategory,
        async () => {
          const { data, error } = await supabase
            .from('categories')
            .insert({ name })
            .select()
            .single();

          if (error) throw error;

          // Replace temp category with real one from server
          setCategories(cats =>
            cats.map(cat => (cat.id === tempId ? { ...data, whitelisted: 0, blacklisted: 0, gibberish: 0, categorized: 0, notCategorized: 0, global_blacklist: 0, allAnswers: 0 } : cat))
          );
        },
        {
          successMessage: `Category "${name}" added`,
          errorMessage: 'Failed to add category',
        }
      );

      setModalOpen(false);
    } catch (error) {
      console.error('Error adding category:', error);
    }
  }

  // Handle category selection
  function handleSelectCategory(category: Category) {
    setActiveCategory(category);
  }

  // Open coding view for category
  function openCategoryInCoding(categoryId: number) {
    window.open(`/coding?categoryId=${categoryId}`, "_blank");
  }

  // Open edit modal for category
  function openEditModal(category: Category) {
    setEditingCategory(category);
  }

  // Handle delete category
  function handleDeleteCategory(categoryId: number) {
    const category = categories.find(c => c.id === categoryId);
    setDeleteConfirm({
      show: true,
      categoryId,
      categoryName: category?.name || 'this category',
    });
  }

  // Confirm delete category (with optimistic updates!)
  async function confirmDelete() {
    if (!deleteConfirm.categoryId) return;

    try {
      // Note: codes check removed as CODES column is removed

      const categoryToRemove = categories.find(c => c.id === deleteConfirm.categoryId);
      if (!categoryToRemove) return;

      // Proceed with optimistic delete
      await optimisticArrayUpdate(
        categories,
        setCategories,
        'remove',
        categoryToRemove,
        async () => {
          const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', deleteConfirm.categoryId);

          if (error) throw error;
        },
        {
          successMessage: `Category "${deleteConfirm.categoryName}" deleted`,
          errorMessage: 'Failed to delete category',
        }
      );

      // Close dialog
      setDeleteConfirm({ show: false, categoryId: null, categoryName: '' });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  }

  // Navigate to coding view with filter
  function handleFilterClick(categoryId: number, _categoryName: string, filterType: string) {
    // Map filter type to general_status value
    const statusMap: Record<string, string> = {
      'whitelisted': 'whitelist',
      'blacklisted': 'blacklist',
      'gibberish': 'gibberish',
      'categorized': 'categorized',
      'notCategorized': 'uncategorized',
      'global_blacklist': 'global_blacklist'
    };

    const status = statusMap[filterType] || filterType;
    window.open(`/coding?categoryId=${categoryId}&filter=${status}`, '_blank');
  }

  // Note: handleCodesClick removed as CODES column is removed

  // Navigate to coding view showing all answers (no filters)
  function handleAllAnswersClick(categoryId: number, _categoryName: string) {
    // Open coding view WITHOUT any filters - shows ALL answers in the category
    window.open(`/coding?categoryId=${categoryId}`, '_blank');
  }

  // Save category settings
  async function saveCategorySettings(data: any) {
    if (!editingCategory) return;

    try {
      // ✅ Build safe payload - remove empty fields to avoid 400 errors
      const updatePayload: any = {
        name: data.name,
      };

      // Optional fields - only add if present and valid
      if (data.googleName && data.googleName.trim()) {
        updatePayload.google_name = data.googleName;
      }

      if (data.description && data.description.trim()) {
        updatePayload.description = data.description;
      }

      // Template - only set if not empty (avoid 400 error)
      if (data.template && data.template.trim()) {
        updatePayload.template = data.template;
      }

      // Preset - ensure it has a value
      if (data.preset) {
        updatePayload.preset = data.preset;
      } else {
        updatePayload.preset = 'LLM Proper Name'; // Default
      }

      if (data.model) {
        updatePayload.model = data.model;
      }

      if (data.brandsSorting) {
        updatePayload.brands_sorting = data.brandsSorting;
      }

      if (data.minLength !== undefined && data.minLength !== null) {
        updatePayload.min_length = data.minLength;
      }

      if (data.maxLength !== undefined && data.maxLength !== null) {
        updatePayload.max_length = data.maxLength;
      }

      // Web context setting
      if (data.useWebContext !== undefined) {
        updatePayload.use_web_context = data.useWebContext;
      }

      console.log('📤 Saving category payload:', updatePayload);

      const { error } = await supabase
        .from('categories')
        .update(updatePayload)
        .eq('id', editingCategory.id);

      if (error) {
        console.error('❌ Supabase error:', error);
        toast.error(`Failed to update category: ${error.message}`);
        return;
      }

      toast.success('✅ Category settings updated successfully');

      // Update local state
      setCategories(prev => prev.map(cat =>
        cat.id === editingCategory.id
          ? { ...cat, name: data.name, use_web_context: data.useWebContext }
          : cat
      ));

      // Update active category if it's the one being edited
      if (activeCategory?.id === editingCategory.id) {
        setActiveCategory(prev => prev ? { ...prev, name: data.name } : null);
      }
    } catch (error) {
      console.error('❌ Unexpected error saving category settings:', error);
      toast.error('Failed to save category settings');
    }
  }


  // Note: category rename handled in EditCategoryModal elsewhere; local update function removed to avoid unused warnings



  if (loading) return (
    <MainLayout>
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-500 dark:text-gray-400">Loading categories...</p>
      </div>
    </MainLayout>
  );

  if (error) return (
    <MainLayout>
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400">
        Error: {error}
      </div>
    </MainLayout>
  );

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // Build breadcrumbs
  const breadcrumbs: Array<{ label: string; href?: string; icon?: React.ReactNode }> = [
    { label: 'Categories', href: '/', icon: <Home size={14} /> }
  ];

  if (activeCategory) {
    breadcrumbs.push({ label: activeCategory.name });
  }

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
            💡 <strong>Tip:</strong> Select a category from the list below to manage its codes and settings
          </p>
        </div>
      )}

      {/* Category selected - show close button */}
      {activeCategory && (
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setActiveCategory(null)}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title="Close category details"
          >
            <X size={14} />
            Close details
          </button>
          <button
            onClick={fetchCategories}
            disabled={loading}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 text-sm rounded-md flex items-center gap-1.5 transition disabled:opacity-50"
            title="Reload category data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Reload
          </button>
        </div>
      )}

      {/* Header with Add button (only when no category selected) */}
      {!activeCategory && (
        <div className="flex justify-between items-center mb-4">
          <div></div> {/* Spacer since title is in layout */}
          <div className="flex gap-2">
            <button
              onClick={fetchCategories}
              disabled={loading}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 text-sm rounded-md flex items-center gap-1.5 transition disabled:opacity-50"
              title="Reload categories"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Reload
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md flex items-center gap-1.5 transition"
            >
              <Plus size={16} />
              Add Category
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search categories..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

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
        <div className={`grid gap-4 ${activeCategory ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Categories Table */}
            <div className="border border-gray-200 dark:border-neutral-700 rounded-md overflow-hidden bg-white dark:bg-neutral-900">
              {/* Table Header */}
              <div className="grid grid-cols-12 bg-gray-100 dark:bg-neutral-800 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase px-4 py-3 border-b border-gray-200 dark:border-neutral-700">
                <div className="col-span-2">Name</div>
                <div className="text-center">All Answers</div>
                <div className="text-center">Whitelisted</div>
                <div className="text-center">Categorized</div>
                <div className="text-center">Not Categorized</div>
                <div className="text-center">Global BL</div>
                <div className="text-center">Blacklisted</div>
                <div className="text-center">Gibberish</div>
                <div className="text-center col-span-2">Actions</div>
              </div>

              {/* Table Body */}
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className={`grid grid-cols-12 items-center px-4 py-3 text-sm border-b border-gray-100 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors ${
                    activeCategory?.id === category.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  {/* Name */}
                  <div
                    className="col-span-2 font-medium text-gray-800 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                    onClick={() => handleSelectCategory(category)}
                  >
                    {category.name}
                  </div>

                  {/* All Answers */}
                  <div
                    onClick={() => handleAllAnswersClick(category.id, category.name)}
                    className="text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline font-medium"
                    title="Click to view ALL answers in this category (no filters)"
                  >
                    {category.allAnswers}
                  </div>

                  {/* Whitelisted */}
                  <div
                    onClick={() => handleFilterClick(category.id, category.name, 'whitelisted')}
                    className="text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                  >
                    {category.whitelisted}
                  </div>

                  {/* Categorized */}
                  <div
                    onClick={() => handleFilterClick(category.id, category.name, 'categorized')}
                    className="text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                  >
                    {category.categorized}
                  </div>

                  {/* Not Categorized */}
                  <div
                    onClick={() => handleFilterClick(category.id, category.name, 'notCategorized')}
                    className="text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                  >
                    {category.notCategorized}
                  </div>

                  {/* Global BL */}
                  <div
                    onClick={() => handleFilterClick(category.id, category.name, 'global_blacklist')}
                    className="text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                  >
                    {category.global_blacklist}
                  </div>

                  {/* Blacklisted */}
                  <div
                    onClick={() => handleFilterClick(category.id, category.name, 'blacklisted')}
                    className="text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                  >
                    {category.blacklisted}
                  </div>

                  {/* Gibberish */}
                  <div
                    onClick={() => handleFilterClick(category.id, category.name, 'gibberish')}
                    className="text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                  >
                    {category.gibberish}
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex justify-center gap-4">
                    <button
                      title="Edit category settings"
                      onClick={() => openEditModal(category)}
                      className="text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300 transition-colors p-1"
                    >
                      <Settings size={20} />
                    </button>
                    <button
                      title="Open coding view"
                      onClick={() => openCategoryInCoding(category.id)}
                      className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors p-1"
                    >
                      <Code2 size={20} />
                    </button>
                    <button
                      title="Delete category"
                      onClick={() => handleDeleteCategory(category.id)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors ml-2 p-1"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          {/* Category Details - Codes List */}
          {activeCategory && (
            <div className="border border-gray-200 dark:border-neutral-700 rounded-md overflow-hidden bg-white dark:bg-neutral-900">
              <CategoryDetails
                selectedCategory={activeCategory}
                onCodesChanged={fetchCategories}
                onEditCategory={openEditModal}
              />
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

      <AddCategoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={addCategory}
      />

      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          onClose={() => {
            setEditingCategory(null);
          }}
          onSave={saveCategorySettings}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Delete Category
            </h3>
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              Are you sure you want to delete "{deleteConfirm.categoryName}"?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm({ show: false, categoryId: null, categoryName: '' })}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
