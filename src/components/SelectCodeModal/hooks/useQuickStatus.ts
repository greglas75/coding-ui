/**
 * Quick Status Handler Hook
 */

import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import type { Answer } from '../../../types';
import { simpleLogger } from '../../../utils/logger';

interface UseQuickStatusProps {
  onSaved: () => void;
}

export function useQuickStatus({ onSaved }: UseQuickStatusProps) {
  const handleQuickStatus = async (answer: Answer, status: string) => {
    // Map short codes to full status names
    const statusMap: Record<string, string> = {
      Oth: 'Other',
      Ign: 'Ignore',
      gBL: 'Global Blacklist',
      BL: 'Blacklist',
      C: 'Confirmed',
    };

    const fullStatus = statusMap[status] || status;

    // Prevent 'C' (Confirmed) if no AI suggestion available
    if (status === 'C') {
      const firstSuggestion = answer.ai_suggestions?.suggestions?.[0];
      if (!firstSuggestion || !firstSuggestion.code_name) {
        toast.error('Cannot confirm: No AI suggestion available');
        return;
      }
    }

    const update: any = {
      quick_status: fullStatus,
      general_status: fullStatus,
    };

    // Special handling for 'C' (Confirmed)
    if (status === 'C') {
      update.general_status = 'whitelist';
      update.coding_date = new Date().toISOString();

      // Auto-accept ALL AI suggestions if available
      const suggestions = answer.ai_suggestions?.suggestions;
      if (suggestions && suggestions.length > 0) {
        const allCodes = suggestions
          .filter(s => s.code_name)
          .map(s => s.code_name)
          .join(', ');
        update.selected_code = allCodes;
        simpleLogger.info(`✅ Auto-accepting ${suggestions.length} AI suggestion(s): ${allCodes}`);
        toast.success(`Status: Whitelist | Codes: ${allCodes}`);
      }
    } else {
      update.coding_date = null;
      // Clear selected_code for non-whitelist statuses
      update.selected_code = null;
      toast.success(`Status: ${fullStatus}`);
    }

    const { error } = await supabase.from('answers').update(update).eq('id', answer.id);

    if (error) {
      toast.error('Failed to update status');
      simpleLogger.error('Status update error:', error);
    } else {
      onSaved(); // Refresh parent
    }
  };

  return { handleQuickStatus };
}

