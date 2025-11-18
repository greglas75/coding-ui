/**
 * Modal Footer Component
 */

import { QuickStatusButtons } from '../../CodingGrid/cells/QuickStatusButtons';
import { supabase } from '../../../lib/supabase';
import type { Answer } from '../../../types';
import { toast } from 'sonner';
import { simpleLogger } from '../../../utils/logger';

interface ModalFooterProps {
  currentAnswerIndex: number;
  allAnswers: Answer[];
  selectedCodes: string[];
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
  onSave: () => Promise<void>;
  onSaved: () => void;
}

export function ModalFooter({
  currentAnswerIndex,
  allAnswers,
  selectedCodes,
  onClose,
  onNavigate,
  onSave,
  onSaved,
}: ModalFooterProps) {
  const handleConfirmAndNext = async () => {
    await onSave();
    if (currentAnswerIndex < allAnswers.length - 1) {
      onNavigate(currentAnswerIndex + 1);
    } else {
      onClose();
    }
  };

  const handleQuickStatus = async (answer: Answer, status: string) => {
    const statusMap: Record<string, string> = {
      Oth: 'Other',
      Ign: 'Ignore',
      gBL: 'Global Blacklist',
      BL: 'Blacklist',
      C: 'Confirmed',
    };

    const fullStatus = statusMap[status] || status;

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

    if (status === 'C') {
      update.general_status = 'whitelist';
      update.coding_date = new Date().toISOString();

      const suggestions = answer.ai_suggestions?.suggestions;
      if (suggestions && suggestions.length > 0) {
        const allCodes = suggestions.filter(s => s.code_name).map(s => s.code_name).join(', ');
        update.selected_code = allCodes;
      }
    } else {
      update.coding_date = null;
    }

    const { error } = await supabase.from('answers').update(update).eq('id', answer.id);

    if (error) {
      toast.error('Failed to update status');
      simpleLogger.error('Status update error:', error);
    } else {
      toast.success(`Status updated to ${fullStatus}`);
      onSaved();
    }
  };

  return (
    <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-200 dark:border-neutral-700 flex-shrink-0">
      {/* Left: Cancel */}
      <button
        onClick={onClose}
        className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white transition-colors"
        title="Cancel without saving (ESC)"
      >
        Cancel
      </button>

      {/* Center: Quick Status + Action buttons */}
      <div className="flex items-center gap-4">
        {/* Quick Status Block */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Quick Status:
          </span>
          <div className="flex items-center gap-1">
            <QuickStatusButtons
              answer={allAnswers[currentAnswerIndex]}
              onStatusChange={handleQuickStatus}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onSave}
            disabled={selectedCodes.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={
              selectedCodes.length > 0
                ? `Confirm ${selectedCodes.length} code(s) and close`
                : 'Select at least one code'
            }
          >
            Confirm Answer
          </button>

          {currentAnswerIndex < allAnswers.length - 1 && (
            <button
              onClick={handleConfirmAndNext}
              disabled={selectedCodes.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              title={
                selectedCodes.length > 0
                  ? `Confirm and move to next answer`
                  : 'Select at least one code'
              }
            >
              Confirm & Next <span>→</span>
            </button>
          )}
        </div>
      </div>

      {/* Right: Navigation Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate(currentAnswerIndex - 1)}
          disabled={currentAnswerIndex === 0}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          title="Previous answer (←)"
        >
          <span>←</span> Previous
        </button>

        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          {currentAnswerIndex + 1} / {allAnswers.length}
        </span>

        <button
          onClick={() => onNavigate(currentAnswerIndex + 1)}
          disabled={currentAnswerIndex >= allAnswers.length - 1}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          title="Next answer (→)"
        >
          Next <span>→</span>
        </button>
      </div>
    </div>
  );
}

