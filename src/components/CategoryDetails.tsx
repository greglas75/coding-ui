import { Settings, FolderTree } from 'lucide-react';
import { useEffect, useState } from 'react';
import { optimisticArrayUpdate } from '../lib/optimisticUpdate';
import { supabase } from '../lib/supabase';
import type { Category } from '../types';
import { CodeframeBuilderModal } from './CodeframeBuilderModal';

interface CategoryDetailsProps {
  selectedCategory: Category | null;
  onCodesChanged?: () => void;
  onEditCategory?: (category: Category) => void;
}

interface CodeWithAssignment {
  id: number;
  name: string;
  is_whitelisted: boolean;
  assigned: boolean;
}

export function CategoryDetails({
  selectedCategory,
  onCodesChanged,
  onEditCategory
}: CategoryDetailsProps) {
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [realCodes, setRealCodes] = useState<CodeWithAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCodeframeBuilder, setShowCodeframeBuilder] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchText]);

  // Load real codes for selected category
  useEffect(() => {
    if (!selectedCategory) {
      setRealCodes([]);
      return;
    }

    const loadCodes = async () => {
      setLoading(true);
      try {
        // Get codes assigned to this category only
        const { data: codesData } = await supabase
          .from('codes_categories')
          .select(`
            code_id,
            codes (
              id,
              name,
              is_whitelisted
            )
          `)
          .eq('category_id', selectedCategory.id);

        // Transform the data to match our interface
        const enriched: CodeWithAssignment[] = (codesData || []).map((item: any) => ({
          id: item.codes.id,
          name: item.codes.name,
          is_whitelisted: item.codes.is_whitelisted,
          assigned: true // All codes here are assigned to this category
        }));

        setRealCodes(enriched);
      } catch (error) {
        console.error('Error loading codes for category:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCodes();
  }, [selectedCategory]);

  const filteredCodes = realCodes.filter(code =>
    code.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  );


  async function handleSelectAll() {
    if (!selectedCategory) return;

    // Get all codes that are not assigned to this category
    const { data: allCodes } = await supabase
      .from('codes')
      .select('id, name, is_whitelisted')
      .order('name');

    const { data: assignedCodes } = await supabase
      .from('codes_categories')
      .select('code_id')
      .eq('category_id', selectedCategory.id);

    const assignedIds = assignedCodes?.map(c => c.code_id) || [];
    const unassignedCodes = (allCodes || []).filter(code => !assignedIds.includes(code.id));

    const relations = unassignedCodes.map(code => ({
      code_id: code.id,
      category_id: selectedCategory.id
    }));

    if (relations.length === 0) return;

    const { error } = await supabase
      .from('codes_categories')
      .insert(relations);

    if (error) {
      console.error('Error assigning codes to category:', error);
      return;
    }

    // Refresh the codes list
    const loadCodes = async () => {
      const { data: codesData } = await supabase
        .from('codes_categories')
        .select(`
          code_id,
          codes (
            id,
            name,
            is_whitelisted
          )
        `)
        .eq('category_id', selectedCategory.id);

      const enriched: CodeWithAssignment[] = (codesData || []).map((item: any) => ({
        id: item.codes.id,
        name: item.codes.name,
        is_whitelisted: item.codes.is_whitelisted,
        assigned: true
      }));

      setRealCodes(enriched);
    };
    loadCodes();
    onCodesChanged?.();
  }

  async function handleClearAll() {
    if (!selectedCategory) return;

    const { error } = await supabase
      .from('codes_categories')
      .delete()
      .eq('category_id', selectedCategory.id);

    if (error) {
      console.error('Error clearing category codes:', error);
      return;
    }

    // Clear the codes list since all codes are now unassigned
    setRealCodes([]);
    onCodesChanged?.();
  }

  async function handleToggleAssign(code: CodeWithAssignment) {
    if (!selectedCategory) return;

    // Remove from category with optimistic update (instant feedback!)
    await optimisticArrayUpdate(
      realCodes,
      setRealCodes,
      'remove',
      code,
      async () => {
        const { error } = await supabase
          .from('codes_categories')
          .delete()
          .eq('code_id', code.id)
          .eq('category_id', selectedCategory.id);

        if (error) throw error;
      },
      {
        successMessage: `"${code.name}" removed from category`,
        errorMessage: 'Failed to remove code from category',
        onSuccess: () => {
          onCodesChanged?.();
        },
      }
    );
  }

  if (!selectedCategory) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-4xl mb-4">📁</div>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            Select a Category
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Choose a category from the list to manage its codes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              {selectedCategory.name}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {realCodes.filter(c => c.assigned).length} codes assigned
            </p>
          </div>
          <div className="flex gap-2">
            {onEditCategory && (
              <button
                onClick={() => onEditCategory(selectedCategory)}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 text-sm rounded-md flex items-center gap-1.5 transition"
                title="Edit category settings (GPT config, validation rules, etc.)"
              >
                <Settings size={16} />
                <span className="hidden sm:inline">Edit Settings</span>
              </button>
            )}
            <button
              onClick={() => setShowCodeframeBuilder(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md flex items-center gap-1.5 transition"
              title="Create and manage codes for this category"
            >
              <FolderTree size={16} />
              <span className="hidden sm:inline">Manage Codes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-3 items-center mb-3">
          <input
            type="text"
            placeholder="Search codes..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="flex-1 px-3 py-2 border border-zinc-300 rounded-md bg-white text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
          />
        </div>

        <div className="flex gap-2 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"
            >
              Add All Remaining Codes
            </button>
            <button
              onClick={handleClearAll}
              disabled={realCodes.length === 0}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Remove All ({realCodes.length} assigned)
            </button>
          </div>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {realCodes.length} codes assigned
          </span>
        </div>
      </div>

      {/* Codes List */}
      <div className="flex-1 overflow-auto max-h-[70vh]">
        <div className="p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">⏳</div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading codes...</p>
            </div>
          ) : filteredCodes.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">🔍</div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {debouncedSearch ? 'No codes found matching your search' : 'No codes available'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCodes.map((code) => (
                <div
                  key={code.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 bg-white dark:bg-zinc-900"
                >
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => handleToggleAssign(code)}
                    className="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {code.name}
                      </span>
                      {code.is_whitelisted && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full dark:bg-green-900/20 dark:text-green-300">
                          Whitelisted
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Codeframe Builder Modal */}
      {selectedCategory && (
        <CodeframeBuilderModal
          isOpen={showCodeframeBuilder}
          onClose={() => setShowCodeframeBuilder(false)}
          category={selectedCategory}
          onCodesCreated={() => {
            loadCodes();
            onCodesChanged?.();
          }}
        />
      )}
    </div>
  );
}
