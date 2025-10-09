# 🪝 useFilters Hook - Integration Guide

## 📋 Overview

The `useFilters` hook provides a clean, reusable way to manage filter state across all dashboard views. It handles debouncing, state management, and provides helper utilities out of the box.

---

## 🚀 Quick Start

### 1. Basic Usage

```tsx
import { useFilters } from '@/hooks/useFilters';

function MyDashboard() {
  const { filters, setFilter, resetFilters, applyFilters } = useFilters({
    onChange: (filters) => {
      console.log('Filters changed:', filters);
      fetchData(filters);
    },
    debounceMs: 500, // Optional: default is 300ms
  });

  return (
    <div>
      <input
        type="text"
        value={filters.search}
        onChange={(e) => setFilter('search', e.target.value)}
        placeholder="Search..."
      />
      
      <button onClick={resetFilters}>Reset</button>
      <button onClick={applyFilters}>Apply</button>
    </div>
  );
}
```

---

## 🔧 Integration with CodingGrid

### Step 1: Add hook to CodingGrid component

```tsx
// In CodingGrid.tsx

import { useFilters } from '../hooks/useFilters';

export function CodingGrid({ answers, density, currentCategoryId }: CodingGridProps) {
  // Initialize useFilters hook
  const {
    filters,
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
    onChange: (updatedFilters) => {
      console.log('🔍 Filters changed:', updatedFilters);
      // Automatically apply filters when they change
      applyFiltersToData(updatedFilters);
    },
    debounceMs: 500, // Debounce search for 500ms
  });

  // Apply filters to data
  function applyFiltersToData(filterState) {
    const filtered = answers.filter((answer) => {
      // Search filter
      if (filterState.search && !answer.answer_text?.toLowerCase().includes(filterState.search.toLowerCase())) {
        return false;
      }

      // Type filter (multi-select)
      if (filterState.types.length > 0) {
        const status = answer.general_status || '';
        if (!filterState.types.includes(status)) return false;
      }

      // Status filter
      if (filterState.status && answer.quick_status !== filterState.status) {
        return false;
      }

      // Language filter
      if (filterState.language && answer.language !== filterState.language) {
        return false;
      }

      // Country filter
      if (filterState.country && answer.country !== filterState.country) {
        return false;
      }

      // Code search filter
      if (filterState.codes.length > 0) {
        // Check if answer has any of the selected codes
        const hasCode = filterState.codes.some(code => 
          answer.selected_code?.toLowerCase().includes(code.toLowerCase())
        );
        if (!hasCode) return false;
      }

      return true;
    });

    setLocalAnswers(filtered);
  }

  // ... rest of component
}
```

### Step 2: Update filter inputs to use hook

```tsx
{/* Search Input */}
<input
  type="text"
  placeholder="Search answers..."
  value={filters.search}
  onChange={(e) => setFilter('search', e.target.value)}
  className="w-full h-9 pl-8 pr-3 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
/>

{/* Type Multi-Select */}
<Menu.Item key={opt.key}>
  {() => (
    <button
      type="button"
      onClick={() => {
        const currentTypes = filters.types;
        const newTypes = currentTypes.includes(opt.key)
          ? currentTypes.filter(t => t !== opt.key)
          : [...currentTypes, opt.key];
        setFilter('types', newTypes);
      }}
      className="w-full flex items-center px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800"
    >
      <input
        type="checkbox"
        checked={filters.types.includes(opt.key)}
        readOnly
        className="mr-2 accent-blue-500"
      />
      <span className="flex-1 text-left">{opt.label}</span>
    </button>
  )}
</Menu.Item>

{/* Select All / Unselect All */}
<button
  onClick={() => setFilter('types', ['uncategorized','categorized','whitelist','blacklist','global_blacklist','gibberish','ignored','other','bad_word'])}
  className="text-xs text-blue-600 hover:text-blue-800"
>
  Select All
</button>
<button
  onClick={() => setFilter('types', [])}
  className="text-xs text-gray-600 hover:text-gray-800"
>
  Unselect All
</button>

{/* Status Dropdown */}
<select
  value={filters.status}
  onChange={(e) => setFilter('status', e.target.value)}
  className="w-full h-9 px-3 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
>
  <option value="">All Statuses</option>
  {filterOptions.statuses.map(status => (
    <option key={status} value={status}>{status}</option>
  ))}
</select>

{/* Language Dropdown */}
<select
  value={filters.language}
  onChange={(e) => setFilter('language', e.target.value)}
  className="w-full h-9 px-3 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
>
  <option value="">All Languages</option>
  {filterOptions.languages.map(lang => (
    <option key={lang} value={lang}>{lang}</option>
  ))}
</select>

{/* Country Dropdown */}
<select
  value={filters.country}
  onChange={(e) => setFilter('country', e.target.value)}
  className="w-full h-9 px-3 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
>
  <option value="">All Countries</option>
  {filterOptions.countries.map(country => (
    <option key={country} value={country}>{country}</option>
  ))}
</select>

{/* Code Search */}
<input
  type="text"
  placeholder="Search codes..."
  value={filters.search} // or use a separate state for code search
  onChange={(e) => setFilter('search', e.target.value)}
  className="w-full h-9 pl-8 pr-3 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
/>
```

### Step 3: Update action buttons

```tsx
<div className="flex gap-2 justify-end mt-4">
  <button
    onClick={applyFilters}
    disabled={isFiltering}
    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1 disabled:opacity-50"
  >
    <Filter className="w-4 h-4" /> Apply Filters
  </button>
  
  <button
    onClick={resetFilters}
    className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-sm flex items-center gap-1"
  >
    <RotateCcw className="w-4 h-4" /> Reset
  </button>
</div>

{/* Optional: Show active filters badge */}
{hasActiveFilters() && (
  <div className="flex items-center gap-2 mt-2">
    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-md">
      {activeFiltersCount} active filter{activeFiltersCount !== 1 ? 's' : ''}
    </span>
    <button
      onClick={resetFilters}
      className="text-xs text-blue-600 hover:text-blue-800"
    >
      Clear all
    </button>
  </div>
)}
```

---

## 📚 API Reference

### Hook Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `initialValues` | `Partial<FiltersState>` | `{}` | Initial filter values |
| `onChange` | `(filters: FiltersState) => void` | `undefined` | Callback fired when filters change (with debounced search) |
| `debounceMs` | `number` | `300` | Debounce delay for search input in milliseconds |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `filters` | `FiltersState` | Current filter state (with debounced search) |
| `rawFilters` | `FiltersState` | Raw filter state (without debounced search) |
| `setFilter` | `(key, value) => void` | Update a single filter |
| `setFilters` | `(updates) => void` | Update multiple filters at once |
| `resetFilters` | `() => void` | Reset all filters to initial/default values |
| `applyFilters` | `() => void` | Manually trigger onChange with current state |
| `hasActiveFilters` | `() => boolean` | Check if any filter is active |
| `activeFiltersCount` | `number` | Number of active filters |
| `rawSearch` | `string` | Raw search value (not debounced) for controlled inputs |
| `debouncedSearch` | `string` | Debounced search value |

### FiltersState Type

```tsx
interface FiltersState {
  search: string;          // Search query
  types: string[];         // Selected types (multi-select)
  status: string;          // Selected status (single select)
  codes: string[];         // Selected codes (multi-select)
  language: string;        // Selected language
  country: string;         // Selected country
}
```

---

## 💡 Advanced Examples

### Example 1: Manual Apply Mode (No Auto-Trigger)

```tsx
function DashboardView() {
  const { rawFilters, setFilter, applyFilters, resetFilters } = useFilters({
    // No onChange = manual mode
    initialValues: {
      types: ['whitelist'],
    }
  });

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    setLoading(true);
    const results = await fetchData(rawFilters);
    setData(results);
    setLoading(false);
  };

  return (
    <>
      <FiltersBar
        filters={rawFilters}
        onChange={setFilter}
        onApply={handleApply}
        onReset={resetFilters}
      />
      {loading ? <Spinner /> : <DataTable data={data} />}
    </>
  );
}
```

### Example 2: Auto-Apply with URL Sync

```tsx
import { useSearchParams } from 'react-router-dom';

function SearchView() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { filters, setFilter, resetFilters } = useFilters({
    initialValues: {
      search: searchParams.get('q') || '',
      types: searchParams.getAll('type'),
    },
    onChange: (filters) => {
      // Sync filters to URL
      const params = new URLSearchParams();
      if (filters.search) params.set('q', filters.search);
      filters.types.forEach(t => params.append('type', t));
      setSearchParams(params);

      // Fetch data
      fetchResults(filters);
    },
  });

  // ... rest of component
}
```

### Example 3: Conditional onChange

```tsx
function AnalyticsView() {
  const [autoApply, setAutoApply] = useState(true);

  const { filters, setFilter, applyFilters, resetFilters } = useFilters({
    onChange: autoApply ? (filters) => loadAnalytics(filters) : undefined,
  });

  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={autoApply}
          onChange={(e) => setAutoApply(e.target.checked)}
        />
        Auto-apply filters
      </label>

      <FiltersBar />

      {!autoApply && (
        <button onClick={applyFilters}>Apply Filters</button>
      )}
    </>
  );
}
```

---

## ✅ Benefits

✅ **DRY Principle** - Reusable across all dashboards  
✅ **Performance** - Built-in debouncing for search  
✅ **Type Safety** - Full TypeScript support  
✅ **Flexible** - Works with auto-apply or manual mode  
✅ **Utilities** - Includes helpers like `hasActiveFilters()` and `activeFiltersCount`  
✅ **Clean API** - Simple, intuitive interface  

---

## 🔄 Migration from Old Code

### Before (inline state management)

```tsx
const [searchText, setSearchText] = useState('');
const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
const [status, setStatus] = useState('');
const [language, setLanguage] = useState('');
const [country, setCountry] = useState('');

const resetFilters = () => {
  setSearchText('');
  setSelectedTypes([]);
  setStatus('');
  setLanguage('');
  setCountry('');
};
```

### After (with useFilters)

```tsx
const { filters, setFilter, resetFilters } = useFilters({
  onChange: (filters) => applyFiltersToData(filters)
});

// Access: filters.search, filters.types, filters.status, etc.
// Update: setFilter('search', value)
// Reset: resetFilters()
```

---

## 🎯 Next Steps

1. ✅ Hook created at `/src/hooks/useFilters.ts`
2. 🔄 Integrate into `CodingGrid.tsx` (replace inline state)
3. 📦 Create reusable `FiltersBar.tsx` component
4. 🧪 Add tests for the hook
5. 📖 Update component documentation

---

**Created:** 2025-01-06  
**Status:** ✅ Ready to use  
**File:** `/src/hooks/useFilters.ts`

