import { Home } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AddCodeModal } from '../components/AddCodeModal';
import { CodeListTable } from '../components/CodeListTable';
import { CodeListToolbar } from '../components/CodeListToolbar';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { MainLayout } from '../components/layout/MainLayout';
import { UploadListModal } from '../components/UploadListModal';
import { fetchCategories } from '../lib/fetchCategories';
import { simpleLogger } from '../utils/logger';
import { recountMentions } from '../lib/metrics';
import { optimisticArrayUpdate, optimisticUpdate } from '../lib/optimisticUpdate';
import { supabase } from '../lib/supabase';
import { useDebounce } from '../hooks/useDebounce';
import { useCodes } from '../hooks/useCodes';
import type { Category, CodeWithCategories } from '../types';

export function CodeListPage() {
  const [categories, setCategories] = useState<Category[]>([]);

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [onlyWhitelisted, setOnlyWhitelisted] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<number[]>([]);

  // Debounce search text (300ms) to avoid excessive queries
  const debouncedSearchText = useDebounce(searchText, 300);

  // Use TanStack Query to fetch codes with usage counts (replaces N+1 pattern)
  const {
    data: codesWithUsage = [],
    isLoading: loading,
    error: queryError,
    refetch: refetchCodes,
  } = useCodes({
    searchText: debouncedSearchText,
    onlyWhitelisted,
    categoryIds: categoryFilter,
  });

  // Convert usage counts to old format for backward compatibility
  const codes = codesWithUsage;
  const codeUsageCounts = codesWithUsage.reduce(
    (acc, code) => ({ ...acc, [code.id]: code.usage_count }),
    {} as Record<number, number>
  );
  const error = queryError ? (queryError as Error).message : null;

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load categories using professional fetcher
  useEffect(() => {
    const loadCategories = async () => {
      simpleLogger.info("CodeListPage - fetching categories...");
      const result = await fetchCategories();

      if (result.success) {
        setCategories(result.data);
      } else {
        simpleLogger.error("Error fetching categories:", result.error);
        // Note: error is now handled by queryError from useCodes hook
      }
    };

    loadCategories();
  }, []);

  // Update code name
  async function updateCodeName(id: number, newName: string) {
    if (!newName.trim()) {
      toast.error("Code name cannot be empty");
      return;
    }

    if (newName.trim().length > 100) {
      toast.error("Code name cannot be longer than 100 characters");
      return;
    }

    try {
      simpleLogger.info("🟡 Renaming code:", id, "→", newName);
      const { error } = await supabase
        .from('codes')
        .update({
          name: newName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      simpleLogger.info("✅ Code name updated successfully:", newName);
      toast.success(`Code renamed to "${newName}"`);

      // Refetch to get updated data with usage counts
      await refetchCodes();
    } catch (error) {
      simpleLogger.error("❌ Failed to update code name:", error);
      toast.error('Failed to update code name');
    }
  }

  // Toggle whitelist status
  async function toggleWhitelist(id: number, isWhitelisted: boolean) {
    try {
      const { error } = await supabase
        .from('codes')
        .update({
          is_whitelisted: isWhitelisted,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast.success(isWhitelisted ? 'Added to whitelist' : 'Removed from whitelist');
      await refetchCodes();
    } catch (error) {
      simpleLogger.error('❌ Failed to update whitelist status:', error);
      toast.error('Failed to update whitelist status');
    }
  }

  // Update code categories
  async function updateCodeCategories(id: number, categoryIds: number[]) {
    try {
      // Delete existing relations
      const { error: deleteError } = await supabase
        .from('codes_categories')
        .delete()
        .eq('code_id', id);

      if (deleteError) {
        simpleLogger.error('Error deleting category relations:', deleteError);
        throw deleteError;
      }

      // Insert new relations
      if (categoryIds.length > 0) {
        const relations = categoryIds.map(categoryId => ({
          code_id: id,
          category_id: categoryId
        }));

        const { error: insertError } = await supabase
          .from('codes_categories')
          .insert(relations);

        if (insertError) {
          simpleLogger.error('Error inserting category relations:', insertError);
          throw insertError;
        }
      }

      await refetchCodes(); // Refresh list
    } catch (error) {
      simpleLogger.error('❌ Failed to update code categories:', error);
      toast.error('Failed to update code categories');
    }
  }

  // Delete code
  function handleDeleteClick(id: number, name: string) {
    // Check if code is in use
    const usageCount = codeUsageCounts[id] || 0;

    if (usageCount > 0) {
      toast.error(
        `Cannot delete "${name}"`,
        {
          description: `This code is used in ${usageCount} answer${usageCount !== 1 ? 's' : ''}. Remove it from all answers first.`,
        }
      );
      return;
    }

    setCodeToDelete({ id, name });
    setDeleteModalOpen(true);
  }

  async function confirmDelete() {
    if (!codeToDelete) return;

    setDeleting(true);

    try {
      // Delete from codes_categories first (foreign key constraint)
      const { error: relationsError } = await supabase
        .from('codes_categories')
        .delete()
        .eq('code_id', codeToDelete.id);

      if (relationsError) throw relationsError;

      // Delete from codes
      const { error } = await supabase
        .from('codes')
        .delete()
        .eq('id', codeToDelete.id);

      if (error) throw error;

      toast.success(`Code "${codeToDelete.name}" deleted`);

      // Close modal
      setDeleteModalOpen(false);
      setCodeToDelete(null);

      // Refetch codes
      await refetchCodes();
    } catch (error) {
      simpleLogger.error('❌ Error deleting code:', error);
      toast.error('Failed to delete code');
    } finally {
      setDeleting(false);
    }
  }

  // Add new code
  async function addCode(name: string, categoryIds: number[]) {
    try {
      const { data, error } = await supabase
        .from('codes')
        .insert({ name })
        .select()
        .single();

      if (error) {
        simpleLogger.error('Error adding code:', error);
        throw error;
      }

      // Add category relations
      if (categoryIds.length > 0) {
        const relations = categoryIds.map(categoryId => ({
        code_id: data.id,
        category_id: categoryId
      }));

      const { error: relationsError } = await supabase
        .from('codes_categories')
        .insert(relations);

      if (relationsError) {
        simpleLogger.error('Error adding category relations:', relationsError);
        throw relationsError;
      }
    }

      toast.success(`Code "${name}" added`);
      setModalOpen(false);

      // Refetch to get updated codes with usage counts
      await refetchCodes();
    } catch (error) {
      simpleLogger.error('❌ Error adding code:', error);
      toast.error('Failed to add code');
    }
  }

  // Bulk upload codes
  async function handleBulkUpload(codeNames: string[], categoryIds: number[]) {
    try {
      toast.info(`Uploading ${codeNames.length} codes...`);

      // Insert all codes
      const { data: insertedCodes, error: insertError } = await supabase
        .from('codes')
        .insert(codeNames.map(name => ({ name })))
        .select();

      if (insertError) {
        simpleLogger.error('Error inserting codes:', insertError);
        toast.error('Failed to upload codes');
        return;
      }

      toast.success(`Successfully uploaded ${insertedCodes.length} codes`);

      // Add category relations if categories selected
      if (categoryIds.length > 0 && insertedCodes.length > 0) {
        const relations = insertedCodes.flatMap(code =>
          categoryIds.map(categoryId => ({
            code_id: code.id,
            category_id: categoryId
          }))
        );

        const { error: relationsError } = await supabase
          .from('codes_categories')
          .insert(relations);

        if (relationsError) {
          simpleLogger.error('Error adding category relations:', relationsError);
          toast.warning('Codes uploaded but category assignment failed');
        } else {
          toast.success(`Assigned to ${categoryIds.length} categories`);
        }
      }

      setUploadModalOpen(false);
      await refetchCodes(); // Refresh list
    } catch (error) {
      simpleLogger.error('Bulk upload error:', error);
      toast.error('Upload failed');
    }
  }

  if (loading) return (
    <MainLayout>
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-500 dark:text-gray-400">Loading codes...</p>
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

  return (
    <MainLayout
      title="Code List"
      breadcrumbs={[
        { label: 'Home', href: '/', icon: <Home size={14} /> },
        { label: 'Code List' }
      ]}
      maxWidth="wide"
    >
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border shadow-sm overflow-hidden">
        <CodeListToolbar
          searchText={searchText}
          setSearchText={setSearchText}
          onlyWhitelisted={onlyWhitelisted}
          setOnlyWhitelisted={setOnlyWhitelisted}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          categories={categories}
          onReload={fetchCodes}
          isLoading={loading}
          onAddCode={async () => {
            // Refresh categories before opening modal
            const result = await fetchCategories();
            if (result.success) {
              setCategories(result.data);
            }
            setModalOpen(true);
          }}
          onBulkUpload={async () => {
            // Refresh categories before opening upload modal
            const result = await fetchCategories();
            if (result.success) {
              setCategories(result.data);
            }
            setUploadModalOpen(true);
          }}
        />

        <CodeListTable
          codes={codes}
          categories={categories}
          codeUsageCounts={codeUsageCounts}
          onUpdateName={updateCodeName}
          onToggleWhitelist={toggleWhitelist}
          onUpdateCategories={updateCodeCategories}
          onDelete={handleDeleteClick}
          onRecountMentions={recountMentions}
        />
      </div>

      <AddCodeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        categories={categories}
        onSave={addCode}
      />

      <UploadListModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        categories={categories}
        onUpload={handleBulkUpload}
      />

      <ConfirmDeleteModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setCodeToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Code"
        message="Are you sure you want to delete this code? This action cannot be undone."
        itemName={codeToDelete?.name}
        loading={deleting}
      />
    </MainLayout>
  );
}
