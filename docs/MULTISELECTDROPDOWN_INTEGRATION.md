# 🎯 MultiSelectDropdown Integration Guide

Complete guide for integrating the new `MultiSelectDropdown` component into your Coding Dashboard.

---

## 📦 Component Location

```
/src/components/filters/MultiSelectDropdown.tsx
```

---

## 🧩 Quick Start

### Basic Import

```tsx
import { MultiSelectDropdown } from '@/components/filters/MultiSelectDropdown';
```

### Minimal Usage

```tsx
const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

<MultiSelectDropdown
  label="Type"
  options={['Option 1', 'Option 2', 'Option 3']}
  selected={selectedTypes}
  onChange={setSelectedTypes}
/>
```

---

## ⚙️ Props Reference

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | ✅ Yes | - | Label displayed above dropdown |
| `options` | `string[]` | ✅ Yes | - | Array of selectable options |
| `selected` | `string[]` | ✅ Yes | - | Currently selected values |
| `onChange` | `(values: string[]) => void` | ✅ Yes | - | Callback when selection changes |
| `placeholder` | `string` | ❌ No | `'Select...'` | Placeholder text when nothing selected |
| `searchable` | `boolean` | ❌ No | `false` | Enable search input |
| `disabled` | `boolean` | ❌ No | `false` | Disable interaction |

---

## 🎨 Features

### ✅ Core Features

- ✅ **Multi-select with checkboxes** – Select multiple items at once
- ✅ **"Select All / Unselect All"** – Bulk selection controls
- ✅ **Optional search** – Filter options by typing
- ✅ **Keyboard navigation** – `Esc` to close, `Enter` to select
- ✅ **Click outside to close** – Auto-close when clicking elsewhere
- ✅ **Dark mode support** – Works in light and dark themes
- ✅ **Responsive** – Adapts to mobile/tablet/desktop
- ✅ **Shows selection count** – e.g., "3 selected", "All selected"
- ✅ **Scrollable** – Handles 100+ options smoothly
- ✅ **Clear button** – Quick "X" to clear all selections

---

## 📱 Responsive Behavior

### Desktop (≥1024px)
```tsx
<div className="grid grid-cols-4 gap-4">
  <MultiSelectDropdown label="Type" options={types} selected={selectedTypes} onChange={setSelectedTypes} />
  <MultiSelectDropdown label="Status" options={statuses} selected={selectedStatuses} onChange={setSelectedStatuses} />
  <MultiSelectDropdown label="Language" options={languages} selected={selectedLanguages} onChange={setSelectedLanguages} />
  <MultiSelectDropdown label="Country" options={countries} selected={selectedCountries} onChange={setSelectedCountries} />
</div>
```

### Tablet (≥768px)
```tsx
<div className="grid grid-cols-2 gap-3">
  {/* 2 columns */}
</div>
```

### Mobile (<768px)
```tsx
<div className="grid grid-cols-1 gap-3">
  {/* 1 column, full width */}
</div>
```

---

## 🧪 Integration Examples

### 1️⃣ **Replace existing Type filter in FiltersBar**

**Before:**
```tsx
<select
  value={filters.types}
  onChange={(e) => updateFilter('types', e.target.value)}
  className="..."
>
  <option value="">All Types</option>
  <option value="whitelist">Whitelist</option>
  <option value="blacklist">Blacklist</option>
</select>
```

**After:**
```tsx
<MultiSelectDropdown
  label="Type"
  options={[
    'Not categorized',
    'Categorized',
    'Whitelist',
    'Blacklist',
    'Gibberish',
    'gBlacklist',
    'Wrong Category',
    'Ignored',
    'Other',
    'Bad Word'
  ]}
  selected={filters.types}
  onChange={(values) => updateFilter('types', values)}
  searchable
/>
```

### 2️⃣ **Code Filter with Search**

```tsx
<MultiSelectDropdown
  label="Code"
  options={codesList.map(c => c.name).sort((a, b) => a.localeCompare(b))}
  selected={filters.codes}
  onChange={(values) => updateFilter('codes', values)}
  searchable
  placeholder="Search codes..."
/>
```

### 3️⃣ **Status Filter**

```tsx
<MultiSelectDropdown
  label="Status"
  options={['Active', 'Pending', 'Completed', 'Archived']}
  selected={filters.status}
  onChange={(values) => updateFilter('status', values)}
  placeholder="All Statuses"
/>
```

### 4️⃣ **Language Filter**

```tsx
<MultiSelectDropdown
  label="Language"
  options={['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Polish']}
  selected={filters.language}
  onChange={(values) => updateFilter('language', values)}
  searchable
/>
```

---

## 🔄 Integration with useFilters Hook

### Step 1: Update `useFilters.ts`

Update filter state to support arrays:

```ts
interface FiltersState {
  search: string;
  types: string[];      // ✅ Changed from string to string[]
  status: string[];     // ✅ Changed from string to string[]
  codes: string[];
  language: string[];   // ✅ Changed from string to string[]
  country: string[];    // ✅ Changed from string to string[]
  minLength: number;
  maxLength: number;
}

const defaultFilters: FiltersState = {
  search: '',
  types: [],
  status: [],
  codes: [],
  language: [],
  country: [],
  minLength: 0,
  maxLength: 0,
};
```

### Step 2: Update Filter Logic

```ts
// Check if any filter is active
const hasActiveFilters = 
  filters.types.length > 0 ||
  filters.status.length > 0 ||
  filters.codes.length > 0 ||
  filters.language.length > 0 ||
  filters.country.length > 0 ||
  filters.minLength > 0 ||
  filters.maxLength > 0;
```

### Step 3: Update CodingGrid Filter Logic

```tsx
const filteredAnswers = useMemo(() => {
  return answers.filter(answer => {
    // Type filter (multi-select)
    if (filters.types.length > 0) {
      const status = answer.general_status || '';
      if (!filters.types.includes(status)) return false;
    }
    
    // Status filter (multi-select)
    if (filters.status.length > 0) {
      if (!filters.status.includes(answer.quick_status)) return false;
    }
    
    // Language filter (multi-select)
    if (filters.language.length > 0) {
      if (!filters.language.includes(answer.language)) return false;
    }
    
    // Country filter (multi-select)
    if (filters.country.length > 0) {
      if (!filters.country.includes(answer.country)) return false;
    }
    
    // Code filter (multi-select)
    if (filters.codes.length > 0 && answer.selected_code) {
      const hasCode = filters.codes.some(code => 
        answer.selected_code?.toLowerCase().includes(code.toLowerCase())
      );
      if (!hasCode) return false;
    }
    
    return true;
  });
}, [answers, filters]);
```

---

## 🎯 Complete Integration Example

### FiltersBar Component

```tsx
import { MultiSelectDropdown } from '@/components/filters/MultiSelectDropdown';

export function FiltersBar({ filters, updateFilter, onApply, onReset }) {
  return (
    <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm">
      {/* Filter Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Search Input */}
        <input
          type="text"
          placeholder="Search answers..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="..."
        />

        {/* Type Filter */}
        <MultiSelectDropdown
          label="Type"
          options={typeOptions}
          selected={filters.types}
          onChange={(values) => updateFilter('types', values)}
          searchable
        />

        {/* Status Filter */}
        <MultiSelectDropdown
          label="Status"
          options={statusOptions}
          selected={filters.status}
          onChange={(values) => updateFilter('status', values)}
        />

        {/* Code Filter */}
        <MultiSelectDropdown
          label="Code"
          options={codeOptions}
          selected={filters.codes}
          onChange={(values) => updateFilter('codes', values)}
          searchable
          placeholder="Search codes..."
        />

        {/* Language Filter */}
        <MultiSelectDropdown
          label="Language"
          options={languageOptions}
          selected={filters.language}
          onChange={(values) => updateFilter('language', values)}
          searchable
        />

        {/* Country Filter */}
        <MultiSelectDropdown
          label="Country"
          options={countryOptions}
          selected={filters.country}
          onChange={(values) => updateFilter('country', values)}
          searchable
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onApply} className="...">
          Apply Filters
        </button>
        <button onClick={onReset} className="...">
          Reset
        </button>
      </div>
    </div>
  );
}
```

---

## 🚀 Performance Tips

### 1. **Large Datasets**
For 1000+ options, enable search:
```tsx
<MultiSelectDropdown searchable options={largeList} ... />
```

### 2. **Memoization**
Memoize expensive computations:
```tsx
const sortedCodes = useMemo(
  () => codesList.sort((a, b) => a.localeCompare(b)),
  [codesList]
);
```

### 3. **Debounce Search**
For server-side filtering, debounce the search:
```tsx
const debouncedSearch = useDebounce(filters.search, 300);
```

---

## 🧪 Testing

### Unit Test Example

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MultiSelectDropdown } from './MultiSelectDropdown';

test('renders and selects multiple options', () => {
  const handleChange = jest.fn();
  
  render(
    <MultiSelectDropdown
      label="Test"
      options={['A', 'B', 'C']}
      selected={[]}
      onChange={handleChange}
    />
  );
  
  // Open dropdown
  fireEvent.click(screen.getByRole('button'));
  
  // Select option
  fireEvent.click(screen.getByLabelText('A'));
  
  expect(handleChange).toHaveBeenCalledWith(['A']);
});
```

---

## 📚 See Also

- **Example File**: `/src/components/filters/MultiSelectDropdown.example.tsx`
- **FiltersBar**: `/src/components/FiltersBar.tsx`
- **useFilters Hook**: `/src/hooks/useFilters.ts`
- **CodingGrid**: `/src/components/CodingGrid.tsx`

---

## 🎉 Summary

✅ **Modern & Beautiful** – Consistent design with your dashboard  
✅ **Fully Responsive** – Works on all screen sizes  
✅ **Feature-Rich** – Search, Select All, keyboard navigation  
✅ **Easy Integration** – Drop-in replacement for existing filters  
✅ **Type-Safe** – Full TypeScript support  
✅ **Dark Mode** – Automatic light/dark theme support  
✅ **Performance** – Handles large datasets smoothly  

**Ready to use in production!** 🚀

