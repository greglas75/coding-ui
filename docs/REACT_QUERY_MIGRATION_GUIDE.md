# 🔄 React Query Migration Guide

## 🎯 Overview

This guide shows how to migrate existing components from manual `useState` + `useEffect` data fetching to React Query hooks for better performance and caching.

---

## 📋 Migration Checklist

### Before Migration
- [ ] Identify components with data fetching
- [ ] Note current fetch triggers (useEffect dependencies)
- [ ] Document current caching strategy
- [ ] List all mutation operations

### After Migration
- [ ] Replace useState with useQuery
- [ ] Remove manual useEffect fetching
- [ ] Update mutations to use useMutation
- [ ] Test cache invalidation
- [ ] Verify optimistic updates work

---

## 🔄 Pattern: Fetching Data

### ❌ Before (Manual State Management)

```typescript
function AnswerTable({ categoryId }) {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnswers() {
      setLoading(true);
      setError(null);
      
      const { data, error: err } = await supabase
        .from('answers')
        .select('*')
        .eq('category_id', categoryId);
      
      if (err) {
        setError(err.message);
      } else {
        setAnswers(data || []);
      }
      
      setLoading(false);
    }
    
    if (categoryId) {
      fetchAnswers();
    }
  }, [categoryId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return <div>{answers.map(a => <div key={a.id}>{a.answer_text}</div>)}</div>;
}
```

**Problems:**
- ❌ Manual loading/error state management
- ❌ No caching - refetches every time
- ❌ No background refresh
- ❌ Duplicate fetches possible

---

### ✅ After (React Query)

```typescript
import { useAnswers } from '../hooks/useAnswersQuery';

function AnswerTable({ categoryId }) {
  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useAnswers({
    categoryId,
    page: 0,
    pageSize: 100,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <button onClick={() => refetch()}>Reload</button>
      {data?.data.map(a => <div key={a.id}>{a.answer_text}</div>)}
    </div>
  );
}
```

**Benefits:**
- ✅ Automatic caching (1 min stale time)
- ✅ Automatic loading/error states
- ✅ Background refetching
- ✅ No duplicate fetches
- ✅ Less code (50% reduction)

---

## 🔄 Pattern: Mutations

### ❌ Before (Manual Updates)

```typescript
async function handleUpdateCode(answerId: number, code: string) {
  setUpdating(true);
  
  const { error } = await supabase
    .from('answers')
    .update({ selected_code: code })
    .eq('id', answerId);
  
  if (error) {
    toast.error(error.message);
  } else {
    toast.success('Updated!');
    // Manually refetch to get latest data
    fetchAnswers();
  }
  
  setUpdating(false);
}
```

**Problems:**
- ❌ Manual loading state
- ❌ UI doesn't update until refetch completes
- ❌ No rollback on error
- ❌ Manual cache invalidation

---

### ✅ After (React Query Mutation)

```typescript
import { useUpdateAnswer } from '../hooks/useAnswersQuery';

function AnswerRow({ answer }) {
  const updateAnswer = useUpdateAnswer();
  
  const handleUpdateCode = (code: string) => {
    updateAnswer.mutate(
      { id: answer.id, updates: { selected_code: code } },
      {
        onSuccess: () => toast.success('Updated!'),
        onError: (error) => toast.error(error.message),
      }
    );
  };
  
  return (
    <button 
      onClick={() => handleUpdateCode('Nike')}
      disabled={updateAnswer.isPending}
    >
      {updateAnswer.isPending ? 'Saving...' : 'Select Nike'}
    </button>
  );
}
```

**Benefits:**
- ✅ Optimistic UI update (instant)
- ✅ Automatic rollback on error
- ✅ Automatic cache invalidation
- ✅ Built-in loading state
- ✅ Error handling included

---

## 🔄 Pattern: Categories

### ❌ Before

```typescript
function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchCategories() {
      setLoading(true);
      const { data } = await supabase.from('categories').select('*');
      setCategories(data || []);
      setLoading(false);
    }
    fetchCategories();
  }, []);

  // ...
}
```

---

### ✅ After

```typescript
import { useCategories } from '../hooks/useCategoriesQuery';

function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();

  // That's it! Categories are cached for 5 minutes
  // ...
}
```

**Reduced from 10 lines to 1 line!**

---

## 🔄 Pattern: Codes

### ❌ Before

```typescript
useEffect(() => {
  if (!categoryId) return;
  
  const cacheKey = `codes_${categoryId}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    setCodes(JSON.parse(cached));
    return;
  }
  
  async function fetchCodes() {
    const { data } = await supabase
      .from('codes_categories')
      .select('codes (id, name)')
      .eq('category_id', categoryId);
    
    const codes = data?.map(d => d.codes).flat();
    setCodes(codes || []);
    localStorage.setItem(cacheKey, JSON.stringify(codes));
  }
  
  fetchCodes();
}, [categoryId]);
```

---

### ✅ After

```typescript
import { useCodes } from '../hooks/useCodesQuery';

const { data: codes, isLoading } = useCodes(categoryId);

// React Query + localStorage caching built-in!
```

**Reduced from 25 lines to 1 line!**

---

## 🔄 Pattern: Prefetching

### Enable Instant Navigation

```typescript
import { useQueryClient } from '@tanstack/react-query';

function CategoryList({ categories }) {
  const queryClient = useQueryClient();
  
  const handleCategoryHover = (categoryId: number) => {
    // Prefetch on hover for instant click
    queryClient.prefetchQuery({
      queryKey: ['answers', categoryId, 0, 100, {}],
      queryFn: () => fetchAnswersForCategory(categoryId),
    });
  };
  
  return (
    <div>
      {categories.map(cat => (
        <div 
          key={cat.id}
          onMouseEnter={() => handleCategoryHover(cat.id)}
        >
          <Link to={`/coding?categoryId=${cat.id}`}>
            {cat.name}
          </Link>
        </div>
      ))}
    </div>
  );
}
```

**Benefit:**
✅ Data pre-loaded before user clicks → instant navigation

---

## 🔄 Pattern: Background Refresh

### Auto-refresh Stale Data

```typescript
const { data, isLoading, dataUpdatedAt } = useAnswers({
  categoryId,
  refetchInterval: 5 * 60_000, // Auto-refetch every 5 min
});

// Show last update time
<div>
  Last updated: {new Date(dataUpdatedAt).toLocaleString()}
</div>
```

---

## 🔄 Pattern: Optimistic Updates

### Instant UI Feedback

```typescript
const updateAnswer = useUpdateAnswer();

// Update feels instant - UI updates before server responds
updateAnswer.mutate({ 
  id: 123, 
  updates: { selected_code: 'Nike' } 
});

// If server fails, UI automatically rolls back
```

**Flow:**
```
User clicks "Select Nike"
      ↓
UI updates instantly (optimistic)
      ↓
Request sent to Supabase
      ↓
┌────────────────┬────────────────┐
│   Success      │     Error      │
│                │                │
│ Keep change    │ Rollback UI    │
│ Invalidate     │ Show error     │
│ cache          │ toast          │
└────────────────┴────────────────┘
```

---

## 📊 Migration Priority

### High Priority (Do First)
1. ✅ **Categories** - Used everywhere, rarely change
2. ✅ **Codes** - Heavy queries, benefit from caching
3. ✅ **Answers** - Most frequent fetches, biggest impact

### Medium Priority
- [ ] Filter options (types, statuses, languages)
- [ ] File import history
- [ ] Code assignments (codes_categories)

### Low Priority
- [ ] User preferences
- [ ] Audit logs
- [ ] Statistics/analytics

---

## 🧪 Testing Migration

### Step 1: Test Query Hook

```typescript
// Add to component temporarily
useEffect(() => {
  console.log('Query state:', {
    data: data?.data.length,
    isLoading,
    isFetching,
    error: error?.message,
  });
}, [data, isLoading, isFetching, error]);
```

### Step 2: Test Cache

```typescript
// Switch categories back and forth
// Second load should be instant (< 50ms)

console.time('Category load');
const { data } = useAnswers({ categoryId: 123 });
console.timeEnd('Category load');
```

### Step 3: Test Mutations

```typescript
// Update and check optimistic UI
const updateAnswer = useUpdateAnswer();
updateAnswer.mutate({ id: 1, updates: { selected_code: 'Nike' } });

// UI should update instantly, then sync with server
```

### Step 4: Test DevTools

```typescript
// Open React Query DevTools
// Navigate to "Queries"
// Click on ['answers', 123, ...]
// Verify data is cached
// Click "Refetch" to manually refresh
```

---

## 🐛 Common Migration Errors

### Error 1: "Cannot read properties of undefined"

**Cause:** Accessing data before it's loaded

```typescript
// ❌ Wrong
const { data } = useAnswers({ categoryId });
return <div>{data.count}</div>; // Error if data is undefined

// ✅ Correct
const { data } = useAnswers({ categoryId });
if (!data) return <div>Loading...</div>;
return <div>{data.count}</div>;
```

### Error 2: "Query is disabled"

**Cause:** Query runs even when disabled

```typescript
// ❌ Wrong
useAnswers({ categoryId: undefined });

// ✅ Correct
useAnswers({ categoryId }); // enabled: !!categoryId in hook
```

### Error 3: "Cache not invalidating"

**Cause:** Wrong queryKey in invalidation

```typescript
// ❌ Wrong
queryClient.invalidateQueries({ queryKey: ['answer'] }); // Typo

// ✅ Correct
queryClient.invalidateQueries({ queryKey: ['answers'] });
```

---

## 📈 Performance Comparison

### Before React Query

```
User clicks category
      ↓
Component renders
      ↓
useEffect runs
      ↓
Fetch from Supabase (500ms)
      ↓
Update state
      ↓
Component re-renders
      ↓
Data displayed

Total time: ~600ms
```

### After React Query

```
User clicks category (first time)
      ↓
Component renders
      ↓
useQuery checks cache (MISS)
      ↓
Fetch from Supabase (500ms)
      ↓
Cache updated
      ↓
Component receives data
      ↓
Data displayed

Total time: ~600ms

User clicks category (second time)
      ↓
Component renders
      ↓
useQuery checks cache (HIT)
      ↓
Return cached data (<10ms)
      ↓
Data displayed

Total time: ~10ms (60x faster!)
```

---

## 🎯 Best Practices

### 1. **Use Specific Query Keys**

```typescript
// ❌ Too generic
queryKey: ['data']

// ✅ Specific and descriptive
queryKey: ['answers', categoryId, page, filters]
```

### 2. **Set Appropriate Stale Times**

```typescript
// Frequently changing data
staleTime: 30_000 // 30 seconds

// Rarely changing data
staleTime: 5 * 60_000 // 5 minutes

// Almost never changes
staleTime: 30 * 60_000 // 30 minutes
```

### 3. **Invalidate Related Queries**

```typescript
// When updating an answer, invalidate:
queryClient.invalidateQueries({ queryKey: ['answers'] }); // All answers
queryClient.invalidateQueries({ queryKey: ['categories', categoryId] }); // If count changed
```

### 4. **Use Optimistic Updates Wisely**

```typescript
// ✅ Good for: UI updates, status changes, simple edits
// ❌ Avoid for: Complex calculations, server-side logic
```

### 5. **Handle Errors Gracefully**

```typescript
const { error } = useAnswers({ categoryId });

if (error) {
  return (
    <div>
      <p>Failed to load answers: {error.message}</p>
      <button onClick={() => refetch()}>Retry</button>
    </div>
  );
}
```

---

## 🎉 Migration Complete!

Once all components use React Query hooks:

✅ **Consistent data fetching** across the app
✅ **Automatic caching** with smart invalidation
✅ **Optimistic updates** for instant UI feedback
✅ **Background refetching** keeps data fresh
✅ **DevTools** for debugging and monitoring

**Your app will feel significantly faster! 🚀**

---

*Migration guide created: 2025-10-07*







