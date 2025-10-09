import { toast } from 'sonner';

interface OptimisticUpdateOptions<T> {
  data: T[];
  setData: (data: T[]) => void;
  id: number | string;
  updates: Partial<T>;
  updateFn: () => Promise<void>;
  onSuccess?: (updated: T) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Optimistic Update Helper
 *
 * Updates UI immediately, then syncs with server.
 * Automatically rolls back on error.
 *
 * @example
 * await optimisticUpdate({
 *   data: codes,
 *   setData: setCodes,
 *   id: codeId,
 *   updates: { name: 'New Name' },
 *   updateFn: async () => {
 *     await supabase.from('codes').update({ name: 'New Name' }).eq('id', codeId);
 *   },
 *   successMessage: 'Code updated',
 * });
 */
export async function optimisticUpdate<T extends { id: number | string }>(
  options: OptimisticUpdateOptions<T>
) {
  const {
    data,
    setData,
    id,
    updates,
    updateFn,
    onSuccess,
    onError,
    successMessage,
    errorMessage = 'Failed to update. Changes reverted.',
  } = options;

  const originalData = [...data];
  const updatedItem = data.find(item => item.id === id);

  if (!updatedItem) {
    throw new Error(`Item with id ${id} not found`);
  }

  // Optimistic update - instant UI feedback
  const newItem = { ...updatedItem, ...updates };
  setData(data.map(item => (item.id === id ? newItem : item)));

  try {
    // Sync with server
    await updateFn();

    if (successMessage) {
      toast.success(successMessage);
    }

    if (onSuccess) {
      onSuccess(newItem);
    }
  } catch (error) {
    // Rollback on error
    setData(originalData);

    const err = error as Error;
    toast.error(errorMessage);
    console.error('Optimistic update failed:', err);

    if (onError) {
      onError(err);
    }

    throw error;
  }
}

/**
 * Optimistic Array Update (Add/Remove)
 *
 * Adds or removes items from array optimistically.
 *
 * @example
 * await optimisticArrayUpdate(
 *   codes,
 *   setCodes,
 *   'add',
 *   newCode,
 *   async () => await supabase.from('codes').insert(newCode),
 *   { successMessage: 'Code added' }
 * );
 */
export async function optimisticArrayUpdate<T extends { id: number | string }>(
  data: T[],
  setData: (data: T[]) => void,
  operation: 'add' | 'remove',
  item: T,
  updateFn: () => Promise<void>,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
) {
  const originalData = [...data];

  // Optimistic update
  if (operation === 'add') {
    setData([...data, item]);
  } else {
    setData(data.filter(i => i.id !== item.id));
  }

  try {
    await updateFn();

    if (options?.successMessage) {
      toast.success(options.successMessage);
    }

    if (options?.onSuccess) {
      options.onSuccess();
    }
  } catch (error) {
    // Rollback
    setData(originalData);

    const err = error as Error;
    toast.error(options?.errorMessage || 'Operation failed. Changes reverted.');
    console.error('Optimistic array update failed:', err);

    if (options?.onError) {
      options.onError(err);
    }

    throw error;
  }
}

/**
 * Optimistic Batch Update
 *
 * Updates multiple items at once optimistically.
 *
 * @example
 * await optimisticBatchUpdate(
 *   answers,
 *   setAnswers,
 *   new Map([
 *     [1, { status: 'completed' }],
 *     [2, { status: 'completed' }],
 *   ]),
 *   async () => {
 *     await supabase.from('answers')
 *       .update({ status: 'completed' })
 *       .in('id', [1, 2]);
 *   }
 * );
 */
export async function optimisticBatchUpdate<T extends { id: number | string }>(
  data: T[],
  setData: (data: T[]) => void,
  updates: Map<number | string, Partial<T>>,
  updateFn: () => Promise<void>,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
) {
  const originalData = [...data];

  // Apply all updates optimistically
  setData(
    data.map(item => {
      const update = updates.get(item.id);
      return update ? { ...item, ...update } : item;
    })
  );

  try {
    await updateFn();

    const message = options?.successMessage || `${updates.size} items updated`;
    toast.success(message);

    if (options?.onSuccess) {
      options.onSuccess();
    }
  } catch (error) {
    // Rollback all changes
    setData(originalData);

    const err = error as Error;
    const message = options?.errorMessage || 'Batch update failed. All changes reverted.';
    toast.error(message);
    console.error('Optimistic batch update failed:', err);

    if (options?.onError) {
      options.onError(err);
    }

    throw error;
  }
}

/**
 * Optimistic Toggle (for boolean fields)
 *
 * Toggles a boolean field optimistically.
 *
 * @example
 * await optimisticToggle(
 *   codes,
 *   setCodes,
 *   codeId,
 *   'is_whitelisted',
 *   async (newValue) => {
 *     await supabase.from('codes')
 *       .update({ is_whitelisted: newValue })
 *       .eq('id', codeId);
 *   }
 * );
 */
export async function optimisticToggle<T extends { id: number | string }>(
  data: T[],
  setData: (data: T[]) => void,
  id: number | string,
  field: keyof T,
  updateFn: (newValue: boolean) => Promise<void>,
  options?: {
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const item = data.find(i => i.id === id);

  if (!item) {
    throw new Error(`Item with id ${id} not found`);
  }

  const currentValue = item[field];

  if (typeof currentValue !== 'boolean') {
    throw new Error(`Field ${String(field)} is not a boolean`);
  }

  const newValue = !currentValue;

  return optimisticUpdate({
    data,
    setData,
    id,
    updates: { [field]: newValue } as Partial<T>,
    updateFn: () => updateFn(newValue),
    successMessage: options?.successMessage,
    errorMessage: options?.errorMessage,
  });
}
