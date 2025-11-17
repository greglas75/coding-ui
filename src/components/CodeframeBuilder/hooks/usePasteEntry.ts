/**
 * Hook for paste-from-Excel code entry logic
 */

import axios from 'axios';
import { useState } from 'react';
import { toast } from 'sonner';

export function usePasteEntry(categoryId: number, onSuccess: () => void) {
  const [pasteText, setPasteText] = useState('');
  const [parsedCodes, setParsedCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const parsePaste = () => {
    if (!pasteText.trim()) {
      toast.error('Please paste some text first');
      return;
    }

    // Split by newlines, tabs, or commas
    const lines = pasteText.split(/[\n\t,]+/);
    const codes = lines
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter((code, index, self) => self.indexOf(code) === index); // Remove duplicates

    if (codes.length === 0) {
      toast.error('No valid codes found in pasted text');
      return;
    }

    setParsedCodes(codes);
    toast.success(`Parsed ${codes.length} unique codes`);
  };

  const saveCodes = async () => {
    if (parsedCodes.length === 0) {
      toast.error('No codes to save');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/v1/codes/bulk-create', {
        category_id: categoryId,
        code_names: parsedCodes,
      });

      toast.success(`Created ${parsedCodes.length} codes!`);
      setPasteText('');
      setParsedCodes([]);
      onSuccess();
    } catch (error: any) {
      toast.error(`Failed to create codes: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    pasteText,
    setPasteText,
    parsedCodes,
    loading,
    parsePaste,
    saveCodes,
  };
}
