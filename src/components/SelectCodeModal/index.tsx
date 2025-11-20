/**
 * SelectCodeModal - Main Component
 * Refactored from 870 lines to modular structure
 */

import { useEffect, useState } from 'react';
import { useCodesForCategory } from '../../hooks/useCodesForCategory';
import { useCodeSuggestions } from '../../hooks/useCodeSuggestions';
import { simpleLogger } from '../../utils/logger';
import { useCodeActions } from './hooks/useCodeActions';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useQuickStatus } from './hooks/useQuickStatus';
import { AnswerDisplay } from './components/AnswerDisplay';
import { AISuggestionsSection } from './components/AISuggestionsSection';
import { CodeList } from './components/CodeList';
import { CodeSearchBar } from './components/CodeSearchBar';
import { ModalFooter } from './components/ModalFooter';
import { SelectedCodesSection } from './components/SelectedCodesSection';
import { SmartSuggestionsSection } from './components/SmartSuggestionsSection';
import type { SelectCodeModalProps } from './types';

export function SelectCodeModal({
  open,
  onClose,
  selectedAnswerIds,
  allAnswers,
  currentAnswerIndex,
  preselectedCodes = [],
  onSaved,
  onNavigate,
  categoryId: _categoryId,
  selectedAnswer: _selectedAnswer,
  translation,
  aiSuggestions,
  onGenerateAISuggestions,
}: SelectCodeModalProps) {
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Use hooks for data fetching
  const { data: codes = [], isLoading: loadingCodes } = useCodesForCategory(_categoryId);
  const { suggestions, loading: loadingSuggestions } = useCodeSuggestions(
    _categoryId,
    _selectedAnswer,
    open
  );

  // Custom hooks
  const { handleQuickStatus } = useQuickStatus({ onSaved });
  const {
    isResetting,
    handleResetCodes,
    handleToggleCode: toggleCode,
    handleApplySuggestion,
    handleSave,
  } = useCodeActions({
    selectedAnswerIds,
    onSaved,
    categoryId: _categoryId,
  });

  // Keyboard navigation - ESC now always works
  useKeyboardNavigation({
    open,
    onClose,
    currentAnswerIndex,
    allAnswers,
    onNavigate,
    handleQuickStatus,
    selectedAnswerIds,
    onGenerateAISuggestions,
  });

  // Reset state when modal opens with new answer
  useEffect(() => {
    if (open) {
      setSelectedCodes(preselectedCodes);
      setSearchTerm('');
      simpleLogger.info('🔄 SelectCodeModal reset: preselectedCodes =', preselectedCodes);
    }
  }, [open, selectedAnswerIds.join(','), preselectedCodes.join(',')]);

  // Wrapper functions for hooks
  const handleToggleCode = (codeName: string) => {
    toggleCode(codeName, selectedCodes, setSelectedCodes);
  };

  const handleApplySuggestionWrapper = async (codeId: number, codeName: string) => {
    await handleApplySuggestion(codeId, codeName, selectedCodes, setSelectedCodes);
  };

  const handleSaveWrapper = async () => {
    await handleSave(selectedCodes, setSelectedCodes);
    onClose();
  };

  const handleResetCodesWrapper = () => {
    handleResetCodes();
    setSelectedCodes([]);
  };

  // Sort codes on search focus
  const handleSearchFocus = () => {
    // Note: codes come from useCodesForCategory hook, sorting would need to be handled there
    // or we could create a sorted copy here if needed
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-5xl w-full h-[80vh] max-h-[600px] shadow-lg border border-gray-200 dark:border-neutral-700 flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex-shrink-0 mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Select or Create Code
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
            title="Close (ESC)"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden">
          {/* Left column – code list */}
          <div className="md:col-span-1 border-r border-gray-200 dark:border-neutral-700 pr-4 flex flex-col">
            <CodeSearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onFocus={handleSearchFocus}
            />
            <CodeList
              codes={codes}
              selectedCodes={selectedCodes}
              searchTerm={searchTerm}
              onToggleCode={handleToggleCode}
            />
          </div>

          {/* Right column – details */}
          <div className="md:col-span-2 flex flex-col overflow-y-auto">
            <div className="space-y-6">
              {/* Answer Display */}
              <AnswerDisplay answer={_selectedAnswer} translation={translation} />

              {/* AI Suggestions & Smart Suggestions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AISuggestionsSection
                  aiSuggestions={aiSuggestions}
                  selectedAnswerIds={selectedAnswerIds}
                  onGenerateAISuggestions={onGenerateAISuggestions}
                  onApplySuggestion={handleApplySuggestionWrapper}
                />
                <SmartSuggestionsSection
                  suggestions={suggestions}
                  loading={loadingSuggestions}
                  onApplySuggestion={handleApplySuggestionWrapper}
                />
              </div>

              {/* Selected Codes */}
              <SelectedCodesSection
                selectedCodes={selectedCodes}
                isResetting={isResetting}
                onToggleCode={handleToggleCode}
                onResetCodes={handleResetCodesWrapper}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <ModalFooter
          currentAnswerIndex={currentAnswerIndex}
          allAnswers={allAnswers}
          selectedCodes={selectedCodes}
          onClose={onClose}
          onNavigate={onNavigate}
          onSave={handleSaveWrapper}
          onSaved={onSaved}
        />
      </div>
    </div>
  );
}

