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
import type { Category, CodeWithCategories } from '../types';

export function CodeListPage() {
  const [codes, setCodes] = useState<CodeWithCategories[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codeUsageCounts, setCodeUsageCounts] = useState<Record<number, number>>({});

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [onlyWhitelisted, setOnlyWhitelisted] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<number[]>([]);

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
        setError(`Failed to load categories: ${result.error instanceof Error ? result.error.message : 'Unknown error'}`);
      }
    };

    loadCategories();
  }, []);


  // Fetch codes with categories
  async function fetchCodes() {
    setLoading(true);
    setError(null);

    try {
      // Base query
      let query = supabase
        .from('codes')
        .select('*')
        .order('name');

      // Apply filters
      if (searchText.trim()) {
        query = query.ilike('name', `%${searchText.trim()}%`);
      }
      if (onlyWhitelisted) {
        query = query.eq('is_whitelisted', true);
      }

      const { data: codesData, error: codesError } = await query;

      if (codesError) {
        setError(codesError.message);
        return;
      }

      // Fetch category relations
      const { data: relationsData, error: relationsError } = await supabase
        .from('codes_categories')
        .select('code_id, category_id');

      if (relationsError) {
        setError(relationsError.message);
        return;
      }

      // Build map of code_id -> category_ids
      const relationsMap = new Map<number, number[]>();
      relationsData?.forEach(rel => {
        if (!relationsMap.has(rel.code_id)) {
          relationsMap.set(rel.code_id, []);
        }
        relationsMap.get(rel.code_id)!.push(rel.category_id);
      });

      // Combine codes with their categories
      const codesWithCategories: CodeWithCategories[] = (codesData || []).map(code => ({
        ...code,
        category_ids: relationsMap.get(code.id) || []
      }));

      // Apply category filter (multi-select)
      let filteredCodes = codesWithCategories;
      if (categoryFilter.length > 0) {
        filteredCodes = codesWithCategories.filter(code =>
          categoryFilter.some(catId => code.category_ids.includes(catId))
        );
      }

      setCodes(filteredCodes);

      // Fetch usage counts for these codes
      const counts = await fetchCodeUsageCounts(codesWithCategories);
      setCodeUsageCounts(counts);
    } catch {
      setError('Failed to fetch codes');
    } finally {
      setLoading(false);
    }
  }

  // Fetch usage count for each code
  async function fetchCodeUsageCounts(codes: CodeWithCategories[]) {
    simpleLogger.info('📊 Fetching usage counts for codes...');

    const countsMap: Record<number, number> = {};

    try {
      // For each code, count how many answers use it
      // Using selected_code field which contains comma-separated code names
      for (const code of codes) {
        const { count, error } = await supabase
          .from('answers')
          .select('id', { count: 'exact', head: true })
          .or(`selected_code.ilike.%${code.name}%,selected_code.ilike.${code.name},%,selected_code.eq.${code.name}`);

        if (!error) {
          countsMap[code.id] = count || 0;
        } else {
          simpleLogger.error(`Error counting usage for code ${code.name}:`, error);
          countsMap[code.id] = 0;
        }
      }

      simpleLogger.info('✅ Code usage counts loaded:', countsMap);
      return countsMap;
    } catch (error) {
      simpleLogger.error('❌ Error fetching code usage counts:', error);
      return {};
    }
  }

  // Fetch codes when filters change
  useEffect(() => {
    fetchCodes();
  }, [searchText, onlyWhitelisted, categoryFilter]);

  // Update code name (with optimistic updates + auto-rollback!)
  async function updateCodeName(id: number, newName: string) {
    if (!newName.trim()) {
      toast.error("Code name cannot be empty");
      return;
    }

    if (newName.trim().length > 100) {
      toast.error("Code name cannot be longer than 100 characters");
      return;
    }

    await optimisticUpdate({
      data: codes,
      setData: setCodes,
      id,
      updates: {
        name: newName.trim(),
        updated_at: new Date().toISOString()
      } as Partial<CodeWithCategories>,
      updateFn: async () => {
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
      },
      successMessage: `Code renamed to "${newName}"`,
      errorMessage: 'Failed to update code name',
    });
  }

  // Toggle whitelist status (instant feedback with optimistic toggle!)
  async function toggleWhitelist(id: number, isWhitelisted: boolean) {
    await optimisticUpdate({
      data: codes,
      setData: setCodes,
      id,
      updates: {
        is_whitelisted: isWhitelisted,
        updated_at: new Date().toISOString()
      } as Partial<CodeWithCategories>,
      updateFn: async () => {
        const { error } = await supabase
          .from('codes')
          .update({
            is_whitelisted: isWhitelisted,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (error) throw error;
      },
      successMessage: isWhitelisted ? 'Added to whitelist' : 'Removed from whitelist',
      errorMessage: 'Failed to update whitelist status',
    });
  }

  // Update code categories
  async function updateCodeCategories(id: number, categoryIds: number[]) {
    // Delete existing relations
    const { error: deleteError } = await supabase
      .from('codes_categories')
      .delete()
      .eq('code_id', id);

    if (deleteError) {
      simpleLogger.error('Error deleting category relations:', deleteError);
      return;
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
        return;
      }
    }

    fetchCodes(); // Refresh list
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

    const codeToRemove = codes.find(c => c.id === codeToDelete.id);
    if (!codeToRemove) return;

    setDeleting(true);

    try {
      await optimisticArrayUpdate(
        codes,
        setCodes,
        'remove',
        codeToRemove,
        async () => {
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
        },
        {
          successMessage: `Code "${codeToDelete.name}" deleted`,
          errorMessage: 'Failed to delete code',
        }
      );

      // Close modal
      setDeleteModalOpen(false);
      setCodeToDelete(null);
    } catch (error) {
      simpleLogger.error('❌ Error deleting code:', error);
    } finally {
      setDeleting(false);
    }
  }

  // Add new code
  async function addCode(name: string, categoryIds: number[]) {
    const { data, error } = await supabase
      .from('codes')
      .insert({ name })
      .select()
      .single();

    if (error) {
      simpleLogger.error('Error adding code:', error);
      return;
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
        return;
      }
    }

    setModalOpen(false);
    fetchCodes(); // Refresh list
    fetchCategories(); // Refresh categories to update counts
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
      fetchCodes(); // Refresh list
      fetchCategories(); // Refresh categories to update counts
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
