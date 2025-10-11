// ═══════════════════════════════════════════════════════════════
// 📚 Virtualization Examples - How to use optimized components
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import type { Answer, Category, CodeWithCategories } from '../../types';
import { OptimizedCodeListTable } from '../OptimizedCodeListTable';
import { OptimizedCodingGrid } from '../OptimizedCodingGrid';

/**
 * Example 1: CodeListTable with automatic virtualization
 */
export function CodeListTableExample() {
  // Generate mock data
  const mockCategories: Category[] = [
    { id: 1, name: 'Electronics', created_at: null, updated_at: null },
    { id: 2, name: 'Fashion', created_at: null, updated_at: null },
  ];

  const mockCodes: CodeWithCategories[] = Array.from({ length: 500 }, (_, i) => ({
    id: i + 1,
    name: `Code ${i + 1}`,
    is_whitelisted: i % 3 === 0,
    category_ids: [1, 2],
    created_at: new Date().toISOString(),
    updated_at: null,
  }));

  const mockUsageCounts: Record<number, number> = {};

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Virtualized Code List Table</h2>
      <p className="text-sm text-gray-600 mb-6">
        500 codes - automatically virtualized for performance
      </p>

      <OptimizedCodeListTable
        codes={mockCodes}
        categories={mockCategories}
        codeUsageCounts={mockUsageCounts}
        onUpdateName={(id, name) => console.log('Update name:', id, name)}
        onToggleWhitelist={(id, isWhitelisted) => console.log('Toggle whitelist:', id, isWhitelisted)}
        onUpdateCategories={(id, categoryIds) => console.log('Update categories:', id, categoryIds)}
        onDelete={(id, name) => console.log('Delete:', id, name)}
        onRecountMentions={async (codeName) => {
          console.log('Recount mentions:', codeName);
          return 0;
        }}
        virtualizationThreshold={100}
      />
    </div>
  );
}

/**
 * Example 2: CodingGrid with infinite scroll
 */
export function CodingGridWithInfiniteScrollExample() {
  // Simulate paginated API
  const fetchPage = async (page: number, pageSize: number): Promise<Answer[]> => {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    const start = (page - 1) * pageSize;
    const newAnswers: Answer[] = Array.from({ length: pageSize }, (_, i) => ({
      id: start + i + 1,
      answer_text: `Answer ${start + i + 1}: This is a test answer`,
      translation: null,
      translation_en: `Answer ${start + i + 1}: This is a test answer`,
      language: 'en',
      country: 'USA',
      quick_status: null,
      general_status: 'uncategorized' as const,
      selected_code: null,
      ai_suggested_code: null,
      ai_suggestions: null,
      category_id: 1,
      coding_date: null,
      confirmed_by: null,
      created_at: new Date().toISOString(),
      updated_at: null,
    }));

    console.log(`📥 Fetched page ${page}: ${newAnswers.length} answers`);
    return newAnswers;
  };

  return (
    <div className="p-6 h-screen">
      <h2 className="text-2xl font-bold mb-4">Virtualized Coding Grid with Infinite Scroll</h2>
      <p className="text-sm text-gray-600 mb-6">
        Scroll down to load more answers automatically
      </p>

      <div className="h-[calc(100vh-200px)]">
        <OptimizedCodingGrid
          fetchPage={fetchPage}
          pageSize={50}
          enableInfiniteScroll={true}
          useLazyLoading={true}
          density="comfortable"
          forceVirtualization={true}
        />
      </div>
    </div>
  );
}

/**
 * Example 3: Manual control over virtualization
 */
export function ManualVirtualizationExample() {
  const [useVirtualization, setUseVirtualization] = useState(false);
  const [itemCount, setItemCount] = useState(50);

  const mockAnswers: Answer[] = Array.from({ length: itemCount }, (_, i) => ({
    id: i + 1,
    answer_text: `Answer ${i + 1}`,
    translation: null,
    translation_en: null,
    language: 'en',
    country: 'USA',
    quick_status: null,
    general_status: 'uncategorized' as const,
    selected_code: null,
    ai_suggested_code: null,
    ai_suggestions: null,
    category_id: 1,
    coding_date: null,
    confirmed_by: null,
    created_at: null,
    updated_at: null,
  }));

  return (
    <div className="p-6 h-screen">
      <h2 className="text-2xl font-bold mb-4">Manual Virtualization Control</h2>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setUseVirtualization(!useVirtualization)}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {useVirtualization ? 'Disable' : 'Enable'} Virtualization
        </button>

        <select
          value={itemCount}
          onChange={(e) => setItemCount(Number(e.target.value))}
          className="px-4 py-2 border rounded"
        >
          <option value={50}>50 items</option>
          <option value={100}>100 items</option>
          <option value={500}>500 items</option>
          <option value={1000}>1000 items</option>
          <option value={5000}>5000 items</option>
        </select>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Mode: {useVirtualization ? '🚀 Virtualized' : '📝 Normal'} |
        Items: {itemCount} |
        Performance: {useVirtualization ? 'Optimized' : itemCount > 500 ? 'May be slow' : 'Good'}
      </p>

      <div className="h-[calc(100vh-300px)]">
        <OptimizedCodingGrid
          initialAnswers={mockAnswers}
          density="comfortable"
          forceVirtualization={useVirtualization}
          virtualizationThreshold={100}
        />
      </div>
    </div>
  );
}

/**
 * All examples combined
 */
export function AllVirtualizationExamples() {
  const [activeExample, setActiveExample] = useState<'codes' | 'grid' | 'manual'>('codes');

  return (
    <div className="max-w-7xl mx-auto">
      {/* Tab Navigation */}
      <div className="flex gap-2 p-4 bg-gray-100 dark:bg-zinc-800">
        <button
          onClick={() => setActiveExample('codes')}
          className={`px-4 py-2 rounded ${
            activeExample === 'codes'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-zinc-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Code List Table
        </button>
        <button
          onClick={() => setActiveExample('grid')}
          className={`px-4 py-2 rounded ${
            activeExample === 'grid'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-zinc-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Infinite Scroll Grid
        </button>
        <button
          onClick={() => setActiveExample('manual')}
          className={`px-4 py-2 rounded ${
            activeExample === 'manual'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-zinc-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Manual Control
        </button>
      </div>

      {/* Examples */}
      {activeExample === 'codes' && <CodeListTableExample />}
      {activeExample === 'grid' && <CodingGridWithInfiniteScrollExample />}
      {activeExample === 'manual' && <ManualVirtualizationExample />}
    </div>
  );
}

