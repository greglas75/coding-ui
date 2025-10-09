# 🔌 Complete Integration Example

This document shows how to integrate the `useFilters` hook with the API filter endpoint in `CodingGrid`.

---

## 📦 Option 1: Direct API Integration (Recommended)

Replace the current inline filtering with API-based filtering:

```tsx
// In CodingGrid.tsx

import { useFilters } from '../hooks/useFilters';
import { fetchFilteredAnswers } from '../lib/apiClient';
import { useState, useEffect } from 'react';

export function CodingGrid({ answers, density, currentCategoryId }: CodingGridProps) {
  const [localAnswers, setLocalAnswers] = useState<Answer[]>(answers);
  const [loading, setLoading] = useState(false);

  // Initialize useFilters hook with API integration
  const {
    filters,
    rawFilters,
    setFilter,
    resetFilters,
    applyFilters,
    hasActiveFilters,
    activeFiltersCount,
  } = useFilters({
    initialValues: {
      search: '',
      types: [],
      status: '',
      codes: [],
      language: '',
      country: '',
    },
    // DON'T use onChange here - we'll manually apply
    debounceMs: 500,
  });

  // Manual apply function that calls API
  const handleApplyFilters = async () => {
    if (!currentCategoryId) {
      console.warn('No category selected');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Applying filters:', rawFilters);
      
      const response = await fetchFilteredAnswers(rawFilters, currentCategoryId);
      
      console.log(`✅ Received ${response.count} filtered results`);
      setLocalAnswers(response.results as Answer[]);
      
    } catch (error) {
      console.error('❌ Filter failed:', error);
      // Fallback to original answers
      setLocalAnswers(answers);
    } finally {
      setLoading(false);
    }
  };

  // Reset filters and reload original data
  const handleResetFilters = () => {
    resetFilters();
    setLocalAnswers(answers);
  };

  // Auto-reload when category changes
  useEffect(() => {
    setLocalAnswers(answers);
  }, [answers, currentCategoryId]);

  return (
    <div className="relative">
      {/* Header */}
      {currentCategoryId && (
        <div className="flex justify-between items-center mb-4 px-3">
          <h2 className="text-lg font-semibold">
            Coding — <span className="text-blue-600">{categoryName}</span>
          </h2>
          <button
            onClick={() => {/* reload */}}
            className="flex items-center gap-1"
          >
            <RefreshCcw className="w-4 h-4" />
            Reload
          </button>
        </div>
      )}

      {/* Filters */}
      {currentCategoryId && (
        <div className="px-3 mb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 bg-white dark:bg-neutral-900 p-4 rounded-lg border">
            
            {/* Search Input */}
            <div>
              <label className="text-xs font-medium">Search</label>
              <input
                type="text"
                placeholder="Search answers..."
                value={rawFilters.search}
                onChange={(e) => setFilter('search', e.target.value)}
                className="w-full h-9 px-3 border rounded-md"
              />
            </div>

            {/* Type Multi-Select */}
            <div>
              <label className="text-xs font-medium">Type</label>
              <Menu as="div" className="relative w-full">
                <Menu.Button className="w-full h-9 px-3 border rounded-md">
                  {rawFilters.types.length === 0 ? 'All Types' : `${rawFilters.types.length} selected`}
                </Menu.Button>
                <Menu.Items className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md">
                  {['uncategorized', 'categorized', 'whitelist', 'blacklist'].map(type => (
                    <Menu.Item key={type}>
                      {() => (
                        <button
                          onClick={() => {
                            const newTypes = rawFilters.types.includes(type)
                              ? rawFilters.types.filter(t => t !== type)
                              : [...rawFilters.types, type];
                            setFilter('types', newTypes);
                          }}
                          className="w-full flex items-center px-2 py-1"
                        >
                          <input
                            type="checkbox"
                            checked={rawFilters.types.includes(type)}
                            readOnly
                            className="mr-2"
                          />
                          {type}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                  <div className="border-t px-2 py-1 flex justify-between">
                    <button onClick={() => setFilter('types', ['uncategorized','categorized','whitelist','blacklist'])}>
                      Select All
                    </button>
                    <button onClick={() => setFilter('types', [])}>
                      Clear
                    </button>
                  </div>
                </Menu.Items>
              </Menu>
            </div>

            {/* Status Dropdown */}
            <div>
              <label className="text-xs font-medium">Status</label>
              <select
                value={rawFilters.status}
                onChange={(e) => setFilter('status', e.target.value)}
                className="w-full h-9 px-3 border rounded-md"
              >
                <option value="">All Statuses</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            {/* Language Dropdown */}
            <div>
              <label className="text-xs font-medium">Language</label>
              <select
                value={rawFilters.language}
                onChange={(e) => setFilter('language', e.target.value)}
                className="w-full h-9 px-3 border rounded-md"
              >
                <option value="">All Languages</option>
                <option value="en">English</option>
                <option value="pl">Polish</option>
              </select>
            </div>

            {/* Country Dropdown */}
            <div>
              <label className="text-xs font-medium">Country</label>
              <select
                value={rawFilters.country}
                onChange={(e) => setFilter('country', e.target.value)}
                className="w-full h-9 px-3 border rounded-md"
              >
                <option value="">All Countries</option>
                <option value="Poland">Poland</option>
                <option value="USA">USA</option>
              </select>
            </div>

            {/* Code Search */}
            <div>
              <label className="text-xs font-medium">Code</label>
              <input
                type="text"
                placeholder="Search codes..."
                className="w-full h-9 px-3 border rounded-md"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end mt-4">
            <button
              onClick={handleApplyFilters}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-1"
            >
              <Filter className="w-4 h-4" />
              {loading ? 'Applying...' : 'Apply Filters'}
            </button>
            <button
              onClick={handleResetFilters}
              className="text-gray-600 hover:text-gray-800 px-4 py-2 flex items-center gap-1"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>

          {/* Active Filters Badge */}
          {hasActiveFilters() && (
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md">
                {activeFiltersCount} active filter{activeFiltersCount !== 1 ? 's' : ''}
              </span>
              <button
                onClick={handleResetFilters}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Filtering answers...</p>
        </div>
      )}

      {/* Data Table */}
      {!loading && (
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th>Answer</th>
                <th>Status</th>
                <th>Code</th>
                <th>Language</th>
                <th>Country</th>
              </tr>
            </thead>
            <tbody>
              {localAnswers.map((answer) => (
                <tr key={answer.id}>
                  <td>{answer.answer_text}</td>
                  <td>{answer.general_status}</td>
                  <td>{answer.selected_code}</td>
                  <td>{answer.language}</td>
                  <td>{answer.country}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && localAnswers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No results found</p>
          {hasActiveFilters() && (
            <button
              onClick={handleResetFilters}
              className="mt-4 text-sm text-blue-600 hover:text-blue-800"
            >
              Clear filters to see all answers
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 📦 Option 2: Auto-Apply (Real-Time Filtering)

Use `onChange` for automatic filtering as user types:

```tsx
const { filters, setFilter, resetFilters } = useFilters({
  onChange: async (filters) => {
    // Auto-trigger on every change (debounced for search)
    if (!currentCategoryId) return;
    
    setLoading(true);
    try {
      const response = await fetchFilteredAnswers(filters, currentCategoryId);
      setLocalAnswers(response.results as Answer[]);
    } catch (error) {
      console.error('Filter failed:', error);
    } finally {
      setLoading(false);
    }
  },
  debounceMs: 800, // Longer debounce for API calls
});
```

---

## 🧪 Testing

### 1. Start Both Servers

```bash
# Terminal 1: API Server
npm run dev:api

# Terminal 2: Vite Dev Server
npm run dev
```

### 2. Test in Browser

1. Open `http://localhost:5173`
2. Navigate to a category
3. Enter search term → wait 500ms → see filtered results
4. Select filters → click "Apply" → see updated results
5. Click "Reset" → see original data

### 3. Check API Logs

In Terminal 1 (API server), you should see:
```
🔍 Filter request: { search: 'nike', types: ['whitelist'], ... }
✅ Filtered 5 answers from 100 total
```

---

## 🎯 Benefits

✅ **Server-side filtering** - Efficient for large datasets  
✅ **Debounced search** - Reduces API calls  
✅ **Loading states** - Better UX  
✅ **Error handling** - Fallback to local data  
✅ **Type-safe** - Full TypeScript support  
✅ **Reusable** - Same pattern for all dashboards  

---

## 📚 Related Files

- **Hook:** `/src/hooks/useFilters.ts`
- **API Client:** `/src/lib/apiClient.ts`
- **API Server:** `/api-server.js`
- **Component:** `/src/components/CodingGrid.tsx`

---

**Created:** 2025-01-06  
**Status:** ✅ Ready to integrate

