import { List, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Category } from "../types";

// ═══════════════════════════════════════════════════════════════
// 🎯 TYPES
// ═══════════════════════════════════════════════════════════════

interface UploadListModalProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onUpload: (codes: string[], categoryIds: number[]) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════
// 🧩 COMPONENT
// ═══════════════════════════════════════════════════════════════

export function UploadListModal({
  open,
  onClose,
  categories,
  onUpload
}: UploadListModalProps) {
  const [list, setList] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setList("");
      setSelectedCategories([]);
    }
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isUploading) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, isUploading]);

  const handleUpload = async () => {
    // Parse and clean codes
    const codes = list
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Validation
    if (codes.length === 0) {
      alert("Please enter at least one code.");
      return;
    }

    if (codes.length > 1000) {
      if (!confirm(`You're about to upload ${codes.length} codes. This may take a while. Continue?`)) {
        return;
      }
    }

    setIsUploading(true);

    try {
      await onUpload(codes, selectedCategories);
      onClose();
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // Parse preview stats
  const previewCodes = list
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const uniqueCodes = [...new Set(previewCodes)];
  const duplicates = previewCodes.length - uniqueCodes.length;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 sm:p-6 w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-neutral-700 animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Upload size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Bulk Upload Codes
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Add multiple codes at once
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            title="Close (ESC)"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Textarea for codes */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              <List size={14} className="inline mr-1" />
              List of Codes:
            </label>
            <textarea
              rows={10}
              value={list}
              onChange={(e) => setList(e.target.value)}
              placeholder="Nike&#10;Adidas&#10;Gucci&#10;Dior&#10;Chanel&#10;...paste brands here, one per line"
              className="w-full border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-gray-100"
              disabled={isUploading}
              autoFocus
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                💡 One code per line. Empty lines will be ignored.
              </p>
              {previewCodes.length > 0 && (
                <div className="text-xs font-medium">
                  <span className="text-blue-600 dark:text-blue-400">
                    {uniqueCodes.length} unique
                  </span>
                  {duplicates > 0 && (
                    <span className="ml-2 text-orange-600 dark:text-orange-400">
                      ({duplicates} duplicates will be merged)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Assign to Categories (optional):
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <label
                  key={category.id}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-all",
                    selectedCategories.includes(category.id)
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                      : "bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-neutral-600"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCategories([...selectedCategories, category.id]);
                      } else {
                        setSelectedCategories(selectedCategories.filter((id) => id !== category.id));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">{category.name}</span>
                </label>
              ))}
            </div>
            {categories.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                No categories available. Create categories first.
              </p>
            )}
          </div>

          {/* Preview */}
          {uniqueCodes.length > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-md border border-gray-200 dark:border-neutral-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Preview (first 10):
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Total: {uniqueCodes.length} codes
                </span>
              </div>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {uniqueCodes.slice(0, 10).map((code, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded text-xs text-gray-700 dark:text-gray-300"
                  >
                    {code}
                  </span>
                ))}
                {uniqueCodes.length > 10 && (
                  <span className="px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                    +{uniqueCodes.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-neutral-700">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading || uniqueCodes.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload {uniqueCodes.length} Code{uniqueCodes.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to avoid importing clsx if not already used
function clsx(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
