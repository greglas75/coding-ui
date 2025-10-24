import { useCallback, useState } from 'react';
import { simpleLogger } from '../../../utils/logger';

export function useInlineEdit<T extends { id: number; name: string }>(
  onSave: (id: number, value: string) => Promise<void>
) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState<Set<number>>(new Set());

  const startEditing = useCallback((item: T) => {
    setEditingId(item.id);
    setTempValue(item.name);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setTempValue('');
  }, []);

  const saveEdit = useCallback(async (id: number) => {
    if (!tempValue.trim()) return;

    setSaving(true);
    try {
      await onSave(id, tempValue.trim());
      setEditingId(null);
      setTempValue('');

      // Trigger success animation
      setSuccessAnimation(prev => new Set(prev).add(id));
      setTimeout(() => {
        setSuccessAnimation(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }, 1000);
    } catch (error) {
      simpleLogger.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  }, [tempValue, onSave]);

  return {
    editingId,
    tempValue,
    setTempValue,
    saving,
    successAnimation,
    startEditing,
    cancelEditing,
    saveEdit,
    isEditing: (id: number) => editingId === id,
    hasSuccessAnimation: (id: number) => successAnimation.has(id)
  };
}
