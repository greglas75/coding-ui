# 🚀 Optimistic Updates - Advanced Patterns

Advanced patterns and examples for complex scenarios.

---

## 📋 Table of Contents

1. [Toggle with Composite Keys](#1-toggle-with-composite-keys)
2. [Nested Data Updates](#2-nested-data-updates)
3. [Optimistic Reordering](#3-optimistic-reordering)
4. [Multi-Step Operations](#4-multi-step-operations)
5. [Conditional Updates](#5-conditional-updates)

---

## 1. Toggle with Composite Keys

### Scenario: Many-to-Many Relationships

When you have a many-to-many relationship (e.g., Invoice ↔ Codes), you need to add/remove junction table records.

```typescript
// src/components/CodingGrid.tsx
import { optimisticArrayUpdate } from '@/lib/optimisticUpdate';

interface Coding {
  id: string;
  invoice_id: number;
  code_id: number;
  created_at: string;
}

export function CodingGrid() {
  const [codings, setCodings] = useState<Coding[]>([]);

  /**
   * Toggle coding (add or remove from junction table)
   */
  const handleToggleCoding = async (
    invoiceId: number,
    codeId: number,
    isActive: boolean
  ) => {
    const codingId = `${invoiceId}-${codeId}`;

    if (isActive) {
      // ✅ ADD: Create coding relationship
      const newCoding: Coding = {
        id: codingId,
        invoice_id: invoiceId,
        code_id: codeId,
        created_at: new Date().toISOString(),
      };

      await optimisticArrayUpdate(
        codings,
        setCodings,
        'add',
        newCoding,
        async () => {
          const { error } = await supabase
            .from('codings')
            .insert({ 
              invoice_id: invoiceId, 
              code_id: codeId 
            });
          
          if (error) throw error;
        },
        {
          successMessage: 'Code assigned to invoice',
          errorMessage: 'Failed to assign code',
        }
      );
    } else {
      // ✅ REMOVE: Delete coding relationship
      const coding = codings.find(
        c => c.invoice_id === invoiceId && c.code_id === codeId
      );
      
      if (!coding) return;

      await optimisticArrayUpdate(
        codings,
        setCodings,
        'remove',
        coding,
        async () => {
          const { error } = await supabase
            .from('codings')
            .delete()
            .eq('invoice_id', invoiceId)
            .eq('code_id', codeId);
          
          if (error) throw error;
        },
        {
          successMessage: 'Code removed from invoice',
          errorMessage: 'Failed to remove code',
        }
      );
    }
  };

  return (
    <div className="coding-grid">
      {/* Checkboxes for codes */}
      {codes.map(code => (
        <label key={code.id}>
          <input
            type="checkbox"
            checked={codings.some(
              c => c.invoice_id === invoiceId && c.code_id === code.id
            )}
            onChange={(e) => 
              handleToggleCoding(invoiceId, code.id, e.target.checked)
            }
          />
          {code.name}
        </label>
      ))}
    </div>
  );
}
```

---

## 2. Nested Data Updates

### Scenario: Update Nested Objects

When your data has nested structures that need updating.

```typescript
import { optimisticUpdate } from '@/lib/optimisticUpdate';

interface Invoice {
  id: number;
  metadata: {
    tags: string[];
    notes: string;
    priority: 'low' | 'medium' | 'high';
  };
}

export function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  /**
   * Update nested metadata field
   */
  const handleUpdateMetadata = async (
    invoiceId: number,
    updates: Partial<Invoice['metadata']>
  ) => {
    const currentInvoice = invoices.find(i => i.id === invoiceId);
    if (!currentInvoice) return;

    await optimisticUpdate({
      data: invoices,
      setData: setInvoices,
      id: invoiceId,
      updates: {
        metadata: {
          ...currentInvoice.metadata,
          ...updates,
        },
      } as Partial<Invoice>,
      updateFn: async () => {
        const { error } = await supabase
          .from('invoices')
          .update({
            metadata: {
              ...currentInvoice.metadata,
              ...updates,
            },
          })
          .eq('id', invoiceId);
        
        if (error) throw error;
      },
      successMessage: 'Metadata updated',
    });
  };

  /**
   * Add tag to metadata
   */
  const handleAddTag = async (invoiceId: number, tag: string) => {
    const currentInvoice = invoices.find(i => i.id === invoiceId);
    if (!currentInvoice) return;

    const newTags = [...currentInvoice.metadata.tags, tag];

    await handleUpdateMetadata(invoiceId, { tags: newTags });
  };

  /**
   * Remove tag from metadata
   */
  const handleRemoveTag = async (invoiceId: number, tagToRemove: string) => {
    const currentInvoice = invoices.find(i => i.id === invoiceId);
    if (!currentInvoice) return;

    const newTags = currentInvoice.metadata.tags.filter(t => t !== tagToRemove);

    await handleUpdateMetadata(invoiceId, { tags: newTags });
  };

  return (
    <div>
      {/* Priority select */}
      <select
        value={invoice.metadata.priority}
        onChange={(e) => 
          handleUpdateMetadata(invoice.id, { 
            priority: e.target.value as any 
          })
        }
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      {/* Tags */}
      <div className="tags">
        {invoice.metadata.tags.map(tag => (
          <span key={tag}>
            {tag}
            <button onClick={() => handleRemoveTag(invoice.id, tag)}>×</button>
          </span>
        ))}
        <button onClick={() => handleAddTag(invoice.id, 'new-tag')}>
          + Add Tag
        </button>
      </div>

      {/* Notes */}
      <textarea
        value={invoice.metadata.notes}
        onChange={(e) => 
          handleUpdateMetadata(invoice.id, { notes: e.target.value })
        }
      />
    </div>
  );
}
```

---

## 3. Optimistic Reordering

### Scenario: Drag & Drop or Reorder Items

```typescript
import { optimisticBatchUpdate } from '@/lib/optimisticUpdate';

interface Task {
  id: number;
  name: string;
  order: number;
}

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);

  /**
   * Reorder tasks (e.g., after drag & drop)
   */
  const handleReorder = async (newOrder: Task[]) => {
    // Create updates map with new order values
    const updates = new Map(
      newOrder.map((task, index) => [
        task.id,
        { order: index }
      ])
    );

    await optimisticBatchUpdate(
      tasks,
      setTasks,
      updates,
      async () => {
        // Update all tasks in one query
        const updatePromises = newOrder.map((task, index) =>
          supabase
            .from('tasks')
            .update({ order: index })
            .eq('id', task.id)
        );

        const results = await Promise.all(updatePromises);
        const errors = results.filter(r => r.error);
        
        if (errors.length > 0) {
          throw new Error('Failed to reorder some tasks');
        }
      },
      {
        successMessage: 'Tasks reordered',
        errorMessage: 'Failed to reorder tasks',
      }
    );
  };

  /**
   * Move task up
   */
  const handleMoveUp = async (taskId: number) => {
    const index = tasks.findIndex(t => t.id === taskId);
    if (index <= 0) return;

    const newOrder = [...tasks];
    [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];

    await handleReorder(newOrder);
  };

  /**
   * Move task down
   */
  const handleMoveDown = async (taskId: number) => {
    const index = tasks.findIndex(t => t.id === taskId);
    if (index >= tasks.length - 1) return;

    const newOrder = [...tasks];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];

    await handleReorder(newOrder);
  };

  return (
    <div>
      {tasks.map(task => (
        <div key={task.id}>
          <span>{task.name}</span>
          <button onClick={() => handleMoveUp(task.id)}>↑</button>
          <button onClick={() => handleMoveDown(task.id)}>↓</button>
        </div>
      ))}
    </div>
  );
}
```

---

## 4. Multi-Step Operations

### Scenario: Complex Operations with Multiple DB Calls

```typescript
import { optimisticUpdate } from '@/lib/optimisticUpdate';

interface Answer {
  id: number;
  status: string;
  assigned_codes: number[];
  ai_processed: boolean;
}

export function AnswerProcessor() {
  const [answers, setAnswers] = useState<Answer[]>([]);

  /**
   * Process answer with AI (multi-step operation)
   */
  const handleAIProcess = async (answerId: number) => {
    await optimisticUpdate({
      data: answers,
      setData: setAnswers,
      id: answerId,
      updates: {
        status: 'processing',
        ai_processed: true,
      } as Partial<Answer>,
      updateFn: async () => {
        // Step 1: Mark as processing
        const { error: statusError } = await supabase
          .from('answers')
          .update({ status: 'processing' })
          .eq('id', answerId);
        
        if (statusError) throw statusError;

        // Step 2: Call AI service
        const aiResult = await fetch('/api/ai-categorize', {
          method: 'POST',
          body: JSON.stringify({ answerId }),
        });

        if (!aiResult.ok) throw new Error('AI processing failed');

        const { suggestedCodes } = await aiResult.json();

        // Step 3: Update with AI results
        const { error: updateError } = await supabase
          .from('answers')
          .update({
            status: 'ai_processed',
            assigned_codes: suggestedCodes,
            ai_processed: true,
          })
          .eq('id', answerId);
        
        if (updateError) throw updateError;

        // Step 4: Update local state with full results
        setAnswers(prev =>
          prev.map(a =>
            a.id === answerId
              ? {
                  ...a,
                  status: 'ai_processed',
                  assigned_codes: suggestedCodes,
                  ai_processed: true,
                }
              : a
          )
        );
      },
      successMessage: 'AI processing completed',
      errorMessage: 'AI processing failed',
    });
  };

  return (
    <div>
      {answers.map(answer => (
        <div key={answer.id}>
          <span>{answer.status}</span>
          <button onClick={() => handleAIProcess(answer.id)}>
            Process with AI
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 5. Conditional Updates

### Scenario: Update Based on Current State

```typescript
import { optimisticUpdate } from '@/lib/optimisticUpdate';

interface Task {
  id: number;
  status: 'todo' | 'in_progress' | 'done';
  assigned_to: string | null;
}

export function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);

  /**
   * Advance task to next status
   */
  const handleAdvanceStatus = async (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Determine next status
    const statusFlow: Record<Task['status'], Task['status']> = {
      todo: 'in_progress',
      in_progress: 'done',
      done: 'todo', // Loop back
    };

    const nextStatus = statusFlow[task.status];

    await optimisticUpdate({
      data: tasks,
      setData: setTasks,
      id: taskId,
      updates: { status: nextStatus } as Partial<Task>,
      updateFn: async () => {
        const { error } = await supabase
          .from('tasks')
          .update({ status: nextStatus })
          .eq('id', taskId);
        
        if (error) throw error;
      },
      successMessage: `Task moved to ${nextStatus.replace('_', ' ')}`,
    });
  };

  /**
   * Assign task to user (only if not assigned)
   */
  const handleAssignToMe = async (taskId: number, userId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.assigned_to) {
      toast.error('Task already assigned to someone else');
      return;
    }

    await optimisticUpdate({
      data: tasks,
      setData: setTasks,
      id: taskId,
      updates: { 
        assigned_to: userId,
        status: 'in_progress'
      } as Partial<Task>,
      updateFn: async () => {
        const { error } = await supabase
          .from('tasks')
          .update({ 
            assigned_to: userId,
            status: 'in_progress'
          })
          .eq('id', taskId)
          .is('assigned_to', null); // Only if not assigned
        
        if (error) throw error;
      },
      successMessage: 'Task assigned to you',
      errorMessage: 'Failed to assign task (may be already assigned)',
    });
  };

  return (
    <div>
      {/* Task board UI */}
    </div>
  );
}
```

---

## 6. Optimistic Filter Updates

### Scenario: Filter Results Instantly

```typescript
import { optimisticUpdate } from '@/lib/optimisticUpdate';

interface FilterPreset {
  id: number;
  name: string;
  filters: Record<string, any>;
  is_favorite: boolean;
}

export function FilterPresets() {
  const [presets, setPresets] = useState<FilterPreset[]>([]);

  /**
   * Toggle favorite status
   */
  const handleToggleFavorite = async (presetId: number) => {
    await optimisticToggle(
      presets,
      setPresets,
      presetId,
      'is_favorite',
      async (newValue) => {
        const { error } = await supabase
          .from('filter_presets')
          .update({ is_favorite: newValue })
          .eq('id', presetId);
        
        if (error) throw error;
      },
      {
        successMessage: newValue => 
          newValue ? '⭐ Added to favorites' : 'Removed from favorites',
      }
    );
  };

  /**
   * Rename preset
   */
  const handleRenamePreset = async (presetId: number, newName: string) => {
    await optimisticUpdate({
      data: presets,
      setData: setPresets,
      id: presetId,
      updates: { name: newName },
      updateFn: async () => {
        const { error } = await supabase
          .from('filter_presets')
          .update({ name: newName })
          .eq('id', presetId);
        
        if (error) throw error;
      },
      successMessage: 'Preset renamed',
    });
  };

  return (
    <div>
      {presets.map(preset => (
        <div key={preset.id}>
          <input
            type="text"
            value={preset.name}
            onChange={(e) => handleRenamePreset(preset.id, e.target.value)}
          />
          <button onClick={() => handleToggleFavorite(preset.id)}>
            {preset.is_favorite ? '⭐' : '☆'}
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 7. Optimistic Counter Updates

### Scenario: Increment/Decrement Counters

```typescript
import { optimisticUpdate } from '@/lib/optimisticUpdate';

interface Product {
  id: number;
  name: string;
  stock: number;
  views: number;
}

export function ProductCard({ product }: { product: Product }) {
  const [products, setProducts] = useState<Product[]>([]);

  /**
   * Increment view count
   */
  const handleIncrementViews = async (productId: number) => {
    const currentProduct = products.find(p => p.id === productId);
    if (!currentProduct) return;

    await optimisticUpdate({
      data: products,
      setData: setProducts,
      id: productId,
      updates: { views: currentProduct.views + 1 } as Partial<Product>,
      updateFn: async () => {
        const { error } = await supabase.rpc('increment_views', {
          product_id: productId,
        });
        
        if (error) throw error;
      },
      // No toast for silent operations
    });
  };

  /**
   * Adjust stock (increment or decrement)
   */
  const handleAdjustStock = async (
    productId: number,
    delta: number
  ) => {
    const currentProduct = products.find(p => p.id === productId);
    if (!currentProduct) return;

    const newStock = currentProduct.stock + delta;

    if (newStock < 0) {
      toast.error('Stock cannot be negative');
      return;
    }

    await optimisticUpdate({
      data: products,
      setData: setProducts,
      id: productId,
      updates: { stock: newStock } as Partial<Product>,
      updateFn: async () => {
        const { error } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', productId);
        
        if (error) throw error;
      },
      successMessage: `Stock adjusted by ${delta > 0 ? '+' : ''}${delta}`,
    });
  };

  return (
    <div>
      <h3>{product.name}</h3>
      <p>Stock: {product.stock}</p>
      <p>Views: {product.views}</p>

      <div className="actions">
        <button onClick={() => handleAdjustStock(product.id, -1)}>-</button>
        <button onClick={() => handleAdjustStock(product.id, +1)}>+</button>
      </div>
    </div>
  );
}
```

---

## 8. Optimistic with React Query

### Scenario: Combine with React Query Mutations

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { optimisticUpdate } from '@/lib/optimisticUpdate';

export function useOptimisticMutation() {
  const queryClient = useQueryClient();

  const updateCodeMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const { error } = await supabase
        .from('codes')
        .update({ name })
        .eq('id', id);
      
      if (error) throw error;
    },
    onMutate: async ({ id, name }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['codes'] });

      // Snapshot the previous value
      const previousCodes = queryClient.getQueryData(['codes']);

      // Optimistically update to the new value
      queryClient.setQueryData(['codes'], (old: any[]) =>
        old.map(code => (code.id === id ? { ...code, name } : code))
      );

      // Return context with previous value
      return { previousCodes };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['codes'], context?.previousCodes);
      toast.error('Failed to update code');
    },
    onSuccess: () => {
      toast.success('Code updated');
    },
    onSettled: () => {
      // Refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['codes'] });
    },
  });

  return updateCodeMutation;
}

// Usage in component:
export function CodeList() {
  const updateCode = useOptimisticMutation();

  return (
    <button onClick={() => updateCode.mutate({ id: 1, name: 'New Name' })}>
      Update
    </button>
  );
}
```

---

## 9. Optimistic with Validation

### Scenario: Validate Before Update

```typescript
import { optimisticUpdate } from '@/lib/optimisticUpdate';

interface FormData {
  id: number;
  email: string;
  age: number;
  username: string;
}

export function UserForm({ user }: { user: FormData }) {
  const [users, setUsers] = useState<FormData[]>([]);

  /**
   * Update with client-side validation
   */
  const handleUpdateEmail = async (userId: number, email: string) => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Invalid email format');
      return;
    }

    // Check if email already exists
    const emailExists = users.some(
      u => u.id !== userId && u.email === email
    );
    
    if (emailExists) {
      toast.error('Email already in use');
      return;
    }

    await optimisticUpdate({
      data: users,
      setData: setUsers,
      id: userId,
      updates: { email },
      updateFn: async () => {
        const { error } = await supabase
          .from('users')
          .update({ email })
          .eq('id', userId);
        
        if (error) throw error;
      },
      successMessage: 'Email updated',
      errorMessage: 'Failed to update email (may already exist)',
    });
  };

  /**
   * Update with server-side validation
   */
  const handleUpdateAge = async (userId: number, age: number) => {
    if (age < 18 || age > 120) {
      toast.error('Age must be between 18 and 120');
      return;
    }

    await optimisticUpdate({
      data: users,
      setData: setUsers,
      id: userId,
      updates: { age },
      updateFn: async () => {
        // Call validation endpoint first
        const validationResult = await fetch('/api/validate-age', {
          method: 'POST',
          body: JSON.stringify({ age }),
        });

        if (!validationResult.ok) {
          throw new Error('Age validation failed');
        }

        // Then update
        const { error } = await supabase
          .from('users')
          .update({ age })
          .eq('id', userId);
        
        if (error) throw error;
      },
      successMessage: 'Age updated',
      errorMessage: 'Invalid age value',
    });
  };

  return (
    <form>
      <input
        type="email"
        value={user.email}
        onChange={(e) => handleUpdateEmail(user.id, e.target.value)}
      />
      <input
        type="number"
        value={user.age}
        onChange={(e) => handleUpdateAge(user.id, parseInt(e.target.value))}
      />
    </form>
  );
}
```

---

## 🎯 Best Practices Summary

### ✅ DO:
1. Use optimistic updates for **all user interactions**
2. Validate on **client-side first** (faster feedback)
3. Keep `updateFn` **focused** (one responsibility)
4. Provide **clear success/error messages**
5. Use **TypeScript** for type safety
6. **Test** error scenarios thoroughly

### ❌ DON'T:
1. Use for **critical operations** (payments, auth)
2. Skip **error handling** in updateFn
3. Use for **read-only** operations
4. Forget **validation** before update
5. Make `updateFn` too **complex**
6. Ignore **rollback** scenarios

---

## 🧪 Testing Advanced Patterns

```typescript
import { describe, it, expect, vi } from 'vitest';
import { optimisticArrayUpdate } from '@/lib/optimisticUpdate';

describe('Toggle with composite keys', () => {
  it('should add and remove coding relationship', async () => {
    const codings: Coding[] = [];
    const setCodings = vi.fn();
    const updateFn = vi.fn().mockResolvedValue(undefined);

    const newCoding: Coding = {
      id: '1-10',
      invoice_id: 1,
      code_id: 10,
      created_at: new Date().toISOString(),
    };

    await optimisticArrayUpdate(
      codings,
      setCodings,
      'add',
      newCoding,
      updateFn
    );

    expect(setCodings).toHaveBeenCalledWith([newCoding]);
    expect(updateFn).toHaveBeenCalled();
  });
});
```

---

## 🚀 Performance Tips

### Tip 1: Debounce Rapid Updates
```typescript
import { useDebouncedCallback } from '@/hooks/useDebounce';

const debouncedUpdate = useDebouncedCallback(
  (id: number, value: string) => {
    optimisticUpdate({
      data: items,
      setData: setItems,
      id,
      updates: { value },
      updateFn: async () => {
        const { error } = await supabase
          .from('items')
          .update({ value })
          .eq('id', id);
        if (error) throw error;
      },
    });
  },
  500
);
```

### Tip 2: Batch Multiple Updates
```typescript
// ❌ Bad - multiple separate updates
for (const id of selectedIds) {
  await optimisticUpdate({ /* ... */ });
}

// ✅ Good - single batch update
await optimisticBatchUpdate(
  items,
  setItems,
  new Map(selectedIds.map(id => [id, updates])),
  async () => {
    const { error } = await supabase
      .from('items')
      .update(updates)
      .in('id', selectedIds);
    if (error) throw error;
  }
);
```

### Tip 3: Silent Updates (No Toast)
```typescript
await optimisticUpdate({
  data: items,
  setData: setItems,
  id,
  updates: { view_count: viewCount + 1 },
  updateFn: async () => {
    await supabase.rpc('increment_view_count', { item_id: id });
  },
  // No successMessage = silent operation
});
```

---

**Ready for advanced optimistic updates!** 🚀

