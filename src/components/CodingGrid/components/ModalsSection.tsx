import { lazy, Suspense } from 'react';
import { X } from 'lucide-react';
import { SelectCodeModal } from '../../SelectCodeModal';
import { RollbackConfirmationModal } from '../../RollbackConfirmationModal';
import { BatchProgressModal } from '../../BatchProgressModal';
import { AutoConfirmSettings } from '../../AutoConfirmSettings';
import type { Answer } from '../../../types';
import type { BatchProgress } from '../../../lib/batchAIProcessor';
import type { BatchAIProcessor } from '../../../lib/batchAIProcessor';
import type { AutoConfirmEngine } from '../../../lib/autoConfirmEngine';

// 🚀 Lazy load heavy components (xlsx ~100KB, recharts ~200KB)
// Only load when modals are opened, reducing initial bundle size
const ExportImportModal = lazy(() =>
  import('../../ExportImportModal').then(m => ({ default: m.ExportImportModal }))
);
const AnalyticsDashboard = lazy(() =>
  import('../../AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard }))
);

interface ModalsSectionProps {
  modals: {
    modalOpen: boolean;
    setModalOpen: (open: boolean) => void;
    selectedAnswer: Answer | null;
    setSelectedAnswer: (answer: Answer | null) => void;
    preselectedCodes: string[];
    setPreselectedCodes: (codes: string[]) => void;
    assignMode: 'overwrite' | 'additional';
    rollbackModalOpen: boolean;
    setRollbackModalOpen: (open: boolean) => void;
    rollbackAnswer: Answer | null;
    setRollbackAnswer: (answer: Answer | null) => void;
    showBatchModal: boolean;
    setShowBatchModal: (show: boolean) => void;
    showExportImport: boolean;
    setShowExportImport: (show: boolean) => void;
    showAnalytics: boolean;
    setShowAnalytics: (show: boolean) => void;
    showAutoConfirmSettings: boolean;
    setShowAutoConfirmSettings: (show: boolean) => void;
  };
  batchSelectedIds: number[];
  answers: Answer[];
  currentCategoryId: number | null;
  handleCodeSaved: () => Promise<void>;
  batchProgress: BatchProgress | null;
  batchProcessor: BatchAIProcessor;
  answerActions: {
    handleSingleAICategorize: (answerId: number) => void;
  };
  autoConfirmEngine: AutoConfirmEngine;
}

export function ModalsSection({
  modals,
  batchSelectedIds,
  answers,
  currentCategoryId,
  handleCodeSaved,
  batchProgress,
  batchProcessor,
  answerActions,
  autoConfirmEngine,
}: ModalsSectionProps) {
  return (
    <>
      <SelectCodeModal
        open={modals.modalOpen}
        onClose={() => {
          modals.setModalOpen(false);
          modals.setSelectedAnswer(null);
          modals.setPreselectedCodes([]);
        }}
        selectedAnswerIds={
          batchSelectedIds.length > 0
            ? batchSelectedIds
            : modals.selectedAnswer
              ? [modals.selectedAnswer.id]
              : []
        }
        allAnswers={answers}
        currentAnswerIndex={
          modals.selectedAnswer ? answers.findIndex(a => a.id === modals.selectedAnswer!.id) : 0
        }
        preselectedCodes={modals.preselectedCodes}
        onSaved={handleCodeSaved}
        onNavigate={newIndex => {
          const newAnswer = answers[newIndex];
          if (newAnswer) {
            modals.setSelectedAnswer(newAnswer);
            modals.setPreselectedCodes([]);
          }
        }}
        mode={modals.assignMode}
        categoryId={currentCategoryId}
        selectedAnswer={modals.selectedAnswer?.answer_text || ''}
        translation={modals.selectedAnswer?.translation_en || ''}
        aiSuggestions={modals.selectedAnswer?.ai_suggestions || undefined}
        onGenerateAISuggestions={answerId => {
          answerActions.handleSingleAICategorize(answerId);
        }}
      />

      <RollbackConfirmationModal
        open={modals.rollbackModalOpen}
        onClose={() => {
          modals.setRollbackModalOpen(false);
          modals.setRollbackAnswer(null);
        }}
        record={
          modals.rollbackAnswer
            ? {
                id: modals.rollbackAnswer.id,
                answer_text: modals.rollbackAnswer.answer_text,
                selected_code: modals.rollbackAnswer.selected_code || '',
                general_status: modals.rollbackAnswer.general_status || '',
                confirmed_by: modals.rollbackAnswer.confirmed_by || '',
                coding_date: modals.rollbackAnswer.coding_date || '',
                category_id: modals.rollbackAnswer.category_id,
              }
            : {
                id: 0,
                answer_text: '',
                selected_code: '',
                general_status: '',
                confirmed_by: '',
                coding_date: '',
                category_id: 0,
              }
        }
        onRollback={async () => {
          /* implement rollback */
        }}
        onRollbackAndEdit={async () => {
          /* implement rollback and edit */
        }}
      />

      {modals.showBatchModal && batchProgress && (
        <BatchProgressModal
          progress={batchProgress}
          onPause={() => batchProcessor.pause()}
          onResume={() => batchProcessor.resume()}
          onCancel={() => {
            batchProcessor.cancel();
            modals.setShowBatchModal(false);
          }}
          onClose={() => modals.setShowBatchModal(false)}
          timeRemaining={batchProcessor.getTimeRemaining()}
          speed={batchProcessor.getSpeed()}
        />
      )}

      {modals.showExportImport && (
        <Suspense
          fallback={
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="text-white">Loading...</div>
            </div>
          }
        >
          <ExportImportModal
            onClose={() => modals.setShowExportImport(false)}
            categoryId={currentCategoryId}
          />
        </Suspense>
      )}

      {modals.showAnalytics && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-auto">
            <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Analytics Dashboard</h2>
              <button onClick={() => modals.setShowAnalytics(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <Suspense fallback={<div className="text-center py-8">Loading analytics...</div>}>
                <AnalyticsDashboard categoryId={currentCategoryId} />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {modals.showAutoConfirmSettings && (
        <AutoConfirmSettings
          engine={autoConfirmEngine}
          onClose={() => modals.setShowAutoConfirmSettings(false)}
        />
      )}
    </>
  );
}
