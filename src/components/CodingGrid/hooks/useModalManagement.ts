import { useCallback, useState } from 'react';
import type { Answer } from '../../../types';

export function useModalManagement({
  onCodingStart,
}: {
  onCodingStart?: (categoryId: number | undefined) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<Answer | null>(null);
  const [rollbackModalOpen, setRollbackModalOpen] = useState(false);
  const [rollbackAnswer, setRollbackAnswer] = useState<Answer | null>(null);
  const [preselectedCodes, setPreselectedCodes] = useState<string[]>([]);
  const [assignMode, setAssignMode] = useState<"overwrite" | "additional">("overwrite");
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAutoConfirmSettings, setShowAutoConfirmSettings] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  const openCodeModal = useCallback((answer: Answer) => {
    console.log('📝 Opening modal for answer:', {
      id: answer.id,
      answer_text: answer.answer_text,
      category_id: answer.category_id,
    });

    setSelectedAnswer(answer);

    const existingCodes = answer.selected_code
      ? answer.selected_code.split(',').map(c => c.trim()).filter(Boolean)
      : [];

    setPreselectedCodes(existingCodes);
    setModalOpen(true);

    if (onCodingStart) {
      onCodingStart(answer.category_id || undefined);
    }
  }, [onCodingStart]);

  const handleCodeClick = useCallback((answer: Answer) => {
    if (answer.general_status === 'whitelist') {
      setRollbackAnswer(answer);
      setRollbackModalOpen(true);
      return;
    }
    openCodeModal(answer);
  }, [openCodeModal]);

  return {
    // Code modal
    modalOpen,
    setModalOpen,
    selectedAnswer,
    setSelectedAnswer,
    preselectedCodes,
    setPreselectedCodes,
    assignMode,
    setAssignMode,
    openCodeModal,
    handleCodeClick,

    // Rollback modal
    rollbackModalOpen,
    setRollbackModalOpen,
    rollbackAnswer,
    setRollbackAnswer,

    // Other modals
    showBatchModal,
    setShowBatchModal,
    showExportImport,
    setShowExportImport,
    showAnalytics,
    setShowAnalytics,
    showAutoConfirmSettings,
    setShowAutoConfirmSettings,
    showShortcutsHelp,
    setShowShortcutsHelp,
  };
}
