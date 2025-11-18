/**
 * Delete Confirmation Modal Component
 */

import type { DeleteConfirmState } from '../types';

interface DeleteConfirmModalProps {
  deleteConfirm: DeleteConfirmState;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({
  deleteConfirm,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!deleteConfirm.show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Delete Category
        </h3>
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          Are you sure you want to delete "{deleteConfirm.categoryName}"? This action cannot be
          undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

