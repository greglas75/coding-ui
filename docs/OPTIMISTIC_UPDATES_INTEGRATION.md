# 🚀 Optimistic Updates - Integration Guide

## Complete Integration Example

This guide shows how to integrate optimistic updates into your components for instant UI feedback.

---

## 📝 Example: CodeListTable.tsx

### Before (Traditional Approach)
```typescript
export function CodeListTable() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleToggleWhitelist = async (id: number, value: boolean) => {
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('codes')
        .update({ is_whitelisted: value })
        .eq('id', id);
      
      if (error) throw error;
      
      // Re-fetch all data
      await fetchCodes();
      toast.success('Updated');
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setLoading(false);
    }
  };

  // ❌ Problems:
  // - User sees loading spinner
  // - Waits 300-500ms for response
  // - Entire list re-fetches
  // - Feels slow
}
```

### After (Optimistic Updates) ⚡
```typescript
import { optimisticUpdate, optimisticArrayUpdate, optimisticBatchUpdate } from '@/lib/optimisticUpdate';

export function CodeListTable() {
  const [codes, setCodes] = useState<Code[]>([]);
  const supabase = createClient();

  // ✅ Toggle whitelist - Instant feedback!
  const handleToggleWhitelist = async (id: number, value: boolean) => {
    await optimisticUpdate({
      data: codes,
      setData: setCodes,
      id,
      updates: { is_whitelisted: value },
      updateFn: async () => {
        const { error } = await supabase
          .from('codes')
          .update({ is_whitelisted: value })
          .eq('id', id);
        
        if (error) throw error;
      },
      successMessage: `Code ${value ? 'whitelisted' : 'removed from whitelist'}`,
      errorMessage: 'Failed to update whitelist status',
    });
  };

  // ✅ Update name - No loading spinner!
  const handleUpdateName = async (id: number, newName: string) => {
    await optimisticUpdate({
      data: codes,
      setData: setCodes,
      id,
      updates: { name: newName },
      updateFn: async () => {
        const { error } = await supabase
          .from('codes')
          .update({ name: newName })
          .eq('id', id);
        
        if (error) throw error;
      },
      successMessage: 'Code name updated',
    });
  };

  // ✅ Delete code - Instant removal!
  const handleDelete = async (code: Code) => {
    if (!confirm(`Delete code "${code.name}"?`)) return;

    await optimisticArrayUpdate(
      codes,
      setCodes,
      'remove',
      code,
      async () => {
        const { error } = await supabase
          .from('codes')
          .delete()
          .eq('id', code.id);
        
        if (error) throw error;
      },
      {
        successMessage: 'Code deleted',
        errorMessage: 'Failed to delete code',
      }
    );
  };

  // ✅ Batch update - Multiple items at once!
  const handleBatchWhitelist = async (ids: number[], value: boolean) => {
    const updates = new Map(ids.map(id => [id, { is_whitelisted: value }]));

    await optimisticBatchUpdate(
      codes,
      setCodes,
      updates,
      async () => {
        const { error } = await supabase
          .from('codes')
          .update({ is_whitelisted: value })
          .in('id', ids);
        
        if (error) throw error;
      },
      {
        successMessage: `${ids.length} codes ${value ? 'whitelisted' : 'removed from whitelist'}`,
      }
    );
  };

  return (
    <div>
      <table>
        {codes.map(code => (
          <tr key={code.id}>
            <td>
              <EditableNameCell
                name={code.name}
                onSave={(newName) => handleUpdateName(code.id, newName)}
              />
            </td>
            <td>
              <input
                type="checkbox"
                checked={code.is_whitelisted}
                onChange={(e) => handleToggleWhitelist(code.id, e.target.checked)}
              />
            </td>
            <td>
              <button onClick={() => handleDelete(code)}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </table>

      <button onClick={() => handleBatchWhitelist(selectedIds, true)}>
        Whitelist Selected
      </button>
    </div>
  );
}
```

---

## 📝 Example: CategoriesPage.tsx

```typescript
import { optimisticUpdate, optimisticArrayUpdate } from '@/lib/optimisticUpdate';

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const supabase = createClient();

  // Update category name
  const handleUpdateName = async (id: number, newName: string) => {
    await optimisticUpdate({
      data: categories,
      setData: setCategories,
      id,
      updates: { name: newName },
      updateFn: async () => {
        const { error } = await supabase
          .from('categories')
          .update({ name: newName })
          .eq('id', id);
        
        if (error) throw error;
      },
      successMessage: 'Category name updated',
    });
  };

  // Add new category
  const handleAddCategory = async (name: string) => {
    const newCategory = {
      id: Date.now(), // Temporary ID
      name,
      created_at: new Date().toISOString(),
    };

    await optimisticArrayUpdate(
      categories,
      setCategories,
      'add',
      newCategory,
      async () => {
        const { data, error } = await supabase
          .from('categories')
          .insert({ name })
          .select()
          .single();
        
        if (error) throw error;
        
        // Update with real ID from server
        setCategories(prev => 
          prev.map(c => c.id === newCategory.id ? data : c)
        );
      },
      {
        successMessage: 'Category added',
      }
    );
  };

  // Delete category
  const handleDeleteCategory = async (category: Category) => {
    await optimisticArrayUpdate(
      categories,
      setCategories,
      'remove',
      category,
      async () => {
        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', category.id);
        
        if (error) throw error;
      },
      {
        successMessage: 'Category deleted',
      }
    );
  };

  return (
    <div>
      {/* Categories list */}
    </div>
  );
}
```

---

## 📝 Example: CodingGrid.tsx (Bulk Operations)

```typescript
import { optimisticBatchUpdate } from '@/lib/optimisticUpdate';

export function CodingGrid() {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const supabase = createClient();

  // Bulk status update
  const handleBulkStatusChange = async (status: string) => {
    const updates = new Map(
      selectedIds.map(id => [id, { general_status: status }])
    );

    await optimisticBatchUpdate(
      answers,
      setAnswers,
      updates,
      async () => {
        const { error } = await supabase
          .from('answers')
          .update({ general_status: status })
          .in('id', selectedIds);
        
        if (error) throw error;
      },
      {
        successMessage: `${selectedIds.length} answers updated to ${status}`,
      }
    );

    setSelectedIds([]);
  };

  // Bulk code assignment
  const handleBulkCodeAssignment = async (codeId: number) => {
    const updates = new Map(
      selectedIds.map(id => [id, { selected_code: codeId }])
    );

    await optimisticBatchUpdate(
      answers,
      setAnswers,
      updates,
      async () => {
        const { error } = await supabase
          .from('answers')
          .update({ selected_code: codeId })
          .in('id', selectedIds);
        
        if (error) throw error;
      },
      {
        successMessage: `Code assigned to ${selectedIds.length} answers`,
      }
    );

    setSelectedIds([]);
  };

  return (
    <div>
      {selectedIds.length > 0 && (
        <div className="bulk-actions">
          <button onClick={() => handleBulkStatusChange('whitelist')}>
            Mark as Whitelist ({selectedIds.length})
          </button>
          <button onClick={() => handleBulkStatusChange('blacklist')}>
            Mark as Blacklist ({selectedIds.length})
          </button>
          <button onClick={() => handleBulkCodeAssignment(selectedCodeId)}>
            Assign Code ({selectedIds.length})
          </button>
        </div>
      )}

      {/* Answers grid */}
    </div>
  );
}
```

---

## 📝 Example: Toggle Operations

```typescript
import { optimisticToggle } from '@/lib/optimisticUpdate';

export function CodeRow({ code }: { code: Code }) {
  const [codes, setCodes] = useContext(CodesContext);
  const supabase = createClient();

  const handleToggleWhitelist = async () => {
    await optimisticToggle(
      codes,
      setCodes,
      code.id,
      'is_whitelisted',
      async (newValue) => {
        const { error } = await supabase
          .from('codes')
          .update({ is_whitelisted: newValue })
          .eq('id', code.id);
        
        if (error) throw error;
      },
      {
        successMessage: newValue => 
          newValue ? 'Added to whitelist' : 'Removed from whitelist',
      }
    );
  };

  return (
    <div>
      <span>{code.name}</span>
      <input
        type="checkbox"
        checked={code.is_whitelisted}
        onChange={handleToggleWhitelist}
      />
    </div>
  );
}
```

---

## 🎯 Integration Checklist

### 1. Import the helpers
```typescript
import { 
  optimisticUpdate, 
  optimisticArrayUpdate, 
  optimisticBatchUpdate,
  optimisticToggle 
} from '@/lib/optimisticUpdate';
```

### 2. Identify operations to optimize
- [ ] Inline editing (name, description, etc.)
- [ ] Toggle operations (whitelist, active, etc.)
- [ ] Delete operations
- [ ] Bulk/batch operations
- [ ] Add new items

### 3. Replace traditional updates
```typescript
// Before
setLoading(true);
await supabase.update(...);
await refetch();
setLoading(false);

// After
await optimisticUpdate({ ... });
```

### 4. Remove loading states
```typescript
// Before
const [loading, setLoading] = useState(false);
{loading && <Spinner />}

// After
// No loading state needed! ⚡
```

### 5. Test error handling
- [ ] Disconnect network
- [ ] Make invalid update
- [ ] Verify rollback works
- [ ] Check toast messages

---

## 🎨 UI Patterns

### Pattern 1: Inline Editing
```typescript
<EditableNameCell
  name={item.name}
  onSave={async (newName) => {
    await optimisticUpdate({
      data: items,
      setData: setItems,
      id: item.id,
      updates: { name: newName },
      updateFn: async () => {
        const { error } = await supabase
          .from('table')
          .update({ name: newName })
          .eq('id', item.id);
        if (error) throw error;
      },
    });
  }}
/>
```

### Pattern 2: Checkbox Toggle
```typescript
<input
  type="checkbox"
  checked={item.is_active}
  onChange={async (e) => {
    await optimisticToggle(
      items,
      setItems,
      item.id,
      'is_active',
      async (newValue) => {
        const { error } = await supabase
          .from('table')
          .update({ is_active: newValue })
          .eq('id', item.id);
        if (error) throw error;
      }
    );
  }}
/>
```

### Pattern 3: Delete Button
```typescript
<button
  onClick={async () => {
    if (!confirm('Delete?')) return;
    
    await optimisticArrayUpdate(
      items,
      setItems,
      'remove',
      item,
      async () => {
        const { error } = await supabase
          .from('table')
          .delete()
          .eq('id', item.id);
        if (error) throw error;
      }
    );
  }}
>
  Delete
</button>
```

### Pattern 4: Bulk Selection
```typescript
<button
  onClick={async () => {
    const updates = new Map(
      selectedIds.map(id => [id, { status: 'completed' }])
    );
    
    await optimisticBatchUpdate(
      items,
      setItems,
      updates,
      async () => {
        const { error } = await supabase
          .from('table')
          .update({ status: 'completed' })
          .in('id', selectedIds);
        if (error) throw error;
      }
    );
  }}
>
  Mark {selectedIds.length} as Completed
</button>
```

---

## ⚠️ Best Practices

### ✅ DO
- Use optimistic updates for all user interactions
- Keep `updateFn` focused (only Supabase call)
- Provide clear success/error messages
- Test error scenarios
- Use TypeScript for type safety

### ❌ DON'T
- Don't use for critical operations (payments, etc.)
- Don't skip error handling
- Don't forget to handle rollback scenarios
- Don't use for read-only operations
- Don't mix with loading states

---

## 🐛 Common Pitfalls

### Issue 1: Stale Data
```typescript
// ❌ Bad - using stale data
const handleUpdate = async () => {
  await optimisticUpdate({
    data: codes, // Stale!
    setData: setCodes,
    // ...
  });
};

// ✅ Good - always use current data
const handleUpdate = async () => {
  await optimisticUpdate({
    data: codes, // Current via closure
    setData: setCodes,
    // ...
  });
};
```

### Issue 2: Missing Error Handling
```typescript
// ❌ Bad
updateFn: async () => {
  await supabase.from('table').update(...);
  // No error check!
}

// ✅ Good
updateFn: async () => {
  const { error } = await supabase.from('table').update(...);
  if (error) throw error;
}
```

### Issue 3: Complex Updates
```typescript
// ❌ Bad - too complex for optimistic update
updateFn: async () => {
  await doMultipleThings();
  await validateSomething();
  await updateDatabase();
  // Too many steps!
}

// ✅ Good - simple, focused update
updateFn: async () => {
  const { error } = await supabase
    .from('table')
    .update({ field: value })
    .eq('id', id);
  if (error) throw error;
}
```

---

## 📊 Performance Impact

```
Before Optimistic Updates:
┌─────────────────────────────────────────────┐
│ User Action                                 │
│   ↓ (wait 300-500ms)                        │
│ Server Response                             │
│   ↓                                         │
│ UI Updates                                  │
└─────────────────────────────────────────────┘
Total: 300-500ms perceived delay ❌

After Optimistic Updates:
┌─────────────────────────────────────────────┐
│ User Action                                 │
│   ↓ (0ms!)                                  │
│ UI Updates Instantly ⚡                     │
│   ↓ (background)                            │
│ Server Sync                                 │
└─────────────────────────────────────────────┘
Total: 0ms perceived delay ✅
```

---

## 🎉 Benefits Summary

### User Experience
- ✅ Instant feedback (0ms)
- ✅ No loading spinners
- ✅ Feels fast and responsive
- ✅ Better user satisfaction

### Developer Experience
- ✅ Simple API
- ✅ Automatic rollback
- ✅ Built-in error handling
- ✅ TypeScript support
- ✅ Easy to test

### Performance
- ✅ Reduced perceived latency
- ✅ No UI blocking
- ✅ Background sync
- ✅ Better UX metrics

---

**Ready to implement? Start with your most frequently used operations!** 🚀

