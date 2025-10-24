import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { simpleLogger } from '../utils/logger';

interface RollbackConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  record: {
    id: number;
    answer_text: string;
    selected_code: string;
    general_status: string;
    confirmed_by?: string;
    coding_date?: string;
    category_id: number;
  };
  onRollback: () => void;
  onRollbackAndEdit?: () => void;
}

export function RollbackConfirmationModal({
  open,
  onClose,
  record,
  onRollback,
  onRollbackAndEdit,
}: RollbackConfirmationModalProps) {
  const queryClient = useQueryClient();
  const [rollingBack, setRollingBack] = useState(false);
  const [fade, setFade] = useState(false);

  // ✅ Stabilny ref dla onClose - nie zmienia się przy re-renderach
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // ✅ Fade in animation on open
  useEffect(() => {
    if (open) {
      setTimeout(() => setFade(true), 50);
    } else {
      setFade(false);
    }
  }, [open]);

  // ✅ Stabilny listener ESC - używa ref zamiast dependency
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        simpleLogger.info("ESC pressed → closing modal");
        onCloseRef.current();
      }
    };

    simpleLogger.info("✅ ESC listener added (RollbackConfirmationModal)");
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      simpleLogger.info("🧹 ESC listener removed (RollbackConfirmationModal)");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]); // Tylko open w dependencies - handler jest wewnątrz useEffect

  // 🟢 Funkcja: tylko rollback
  const handleRollback = async () => {
    setRollingBack(true);
    try {
      // Find all identical answers (same text, same category)
      const { data: duplicates } = await supabase
        .from("answers")
        .select("id")
        .eq("category_id", record.category_id)
        .eq("answer_text", record.answer_text)
        .neq("id", record.id);

      const allIds = [record.id, ...(duplicates?.map(d => d.id) || [])];
      const totalCount = allIds.length;

      simpleLogger.info(`🔄 Rolling back ${totalCount} identical answer(s)...`);

      const { error } = await supabase
        .from("answers")
        .update({
          general_status: "uncategorized",
          quick_status: null,  // Reset quick status button
          selected_code: null,  // Remove code from Code column
          coding_date: null,   // Clear coding date
          updated_at: new Date().toISOString(),
        })
        .in("id", allIds);

      if (error) throw error;

      if (totalCount > 1) {
        toast.success(`Rolled back ${totalCount} identical answers`);
      } else {
        toast.success("Record rolled back successfully");
      }

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["answers"] });

      onRollback();
      onClose();
    } catch (err: any) {
      simpleLogger.error("❌ Error rolling back:", err);
      toast.error("Failed to rollback record");
    } finally {
      setRollingBack(false);
    }
  };

  // 🟠 Funkcja: rollback + otwarcie edycji
  const handleRollbackAndEdit = async () => {
    setRollingBack(true);
    try {
      // Find all identical answers (same text, same category)
      const { data: duplicates } = await supabase
        .from("answers")
        .select("id")
        .eq("category_id", record.category_id)
        .eq("answer_text", record.answer_text)
        .neq("id", record.id);

      const allIds = [record.id, ...(duplicates?.map(d => d.id) || [])];
      const totalCount = allIds.length;

      simpleLogger.info(`🔄 Rolling back ${totalCount} identical answer(s) for editing...`);

      const { error } = await supabase
        .from("answers")
        .update({
          general_status: "uncategorized",
          quick_status: null,  // Reset quick status button
          coding_date: null,   // Clear coding date
          updated_at: new Date().toISOString(),
        })
        .in("id", allIds);

      if (error) throw error;

      if (totalCount > 1) {
        toast.success(`Rolled back ${totalCount} identical answers`);
      } else {
        toast.success("Record rolled back successfully");
      }

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["answers"] });

      onRollbackAndEdit?.();
      onClose();
    } catch (err: any) {
      simpleLogger.error("❌ Error rolling back:", err);
      toast.error("Failed to rollback record");
    } finally {
      setRollingBack(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/40 flex items-center justify-center z-50 transition-opacity duration-200 ${
        fade ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(e) => {
        // kliknięcie poza modalem również zamyka
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-lg w-full shadow-lg relative transform transition-all duration-200 ${
          fade ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Rollback Required
        </h2>

        <div className="space-y-4 mb-6">
          {/* Respondent's Answer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Respondent's Answer
            </label>
            <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-md border border-gray-200 dark:border-neutral-700">
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {record.answer_text}
              </p>
            </div>
          </div>

          {/* Recognition Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Recognition Status
            </label>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                {record.general_status}
              </span>
            </div>
          </div>

          {/* Codes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Codes
            </label>
            <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-md border border-gray-200 dark:border-neutral-700">
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {record.selected_code || "No codes assigned"}
              </p>
            </div>
          </div>

          {/* Date */}
          {record.coding_date && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-md border border-gray-200 dark:border-neutral-700">
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {new Date(record.coding_date).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <div className="flex items-start gap-2">
            <svg
              className="h-5 w-5 text-yellow-400 mt-0.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Rollback Warning
              </h3>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                This will unconfirm the record and allow you to edit the codes.
                The existing codes will be preserved and ready for editing.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title="Cancel and close (ESC)"
          >
            Cancel
          </button>
          <button
            onClick={handleRollback}
            disabled={rollingBack}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 transition-colors"
            title="Mark as uncategorized only"
          >
            {rollingBack ? "Rolling Back..." : "Just Roll Back"}
          </button>
          {onRollbackAndEdit && (
            <button
              onClick={handleRollbackAndEdit}
              disabled={rollingBack}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 transition-colors"
              title="Roll back and immediately open edit modal"
            >
              {rollingBack ? "Rolling Back..." : "Roll Back & Edit"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
