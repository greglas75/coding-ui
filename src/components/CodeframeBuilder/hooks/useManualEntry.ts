/**
 * Hook for manual code entry logic
 */

import axios from 'axios';
import { useState } from 'react';
import { toast } from 'sonner';

export function useManualEntry(categoryId: number, onSuccess: () => void) {
  const [codeName, setCodeName] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addCode = () => {
    const trimmed = codeName.trim();
    if (!trimmed) {
      toast.error('Please enter a code name');
      return;
    }
    if (codes.includes(trimmed)) {
      toast.error('Code already added');
      return;
    }
    setCodes([...codes, trimmed]);
    setCodeName('');
    toast.success(`Added: ${trimmed}`);
  };

  const removeCode = (code: string) => {
    setCodes(codes.filter(c => c !== code));
  };

  const clearAll = () => {
    setCodes([]);
  };

  const saveCodes = async () => {
    if (codes.length === 0) {
      toast.error('No codes to save');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/v1/codes/bulk-create', {
        category_id: categoryId,
        code_names: codes,
      });

      toast.success(`Created ${codes.length} codes!`);
      setCodes([]);
      setCodeName('');
      onSuccess();
    } catch (error: any) {
      toast.error(`Failed to create codes: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    codeName,
    setCodeName,
    codes,
    loading,
    addCode,
    removeCode,
    clearAll,
    saveCodes,
  };
}
