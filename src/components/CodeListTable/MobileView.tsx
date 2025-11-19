/**
 * Mobile Card View
 * Renders code list as cards for mobile screens
 */

import type { Category, CodeWithCategories } from '../../types';

interface MobileViewProps {
  sortedCodes: CodeWithCategories[];
  categories: Category[];
  codeUsageCounts: Record<number, number>;
  editingName: number | null;
  tempName: string;
  savingName: boolean;
  successAnimation: Set<number>;
  onStartEditingName: (code: CodeWithCategories) => void;
  onSaveName: (codeId: number) => void;
  onCancelEditingName: () => void;
  onToggleWhitelist: (codeId: number, checked: boolean) => void;
  onDelete: (codeId: number, codeName: string) => void;
  setTempName: (name: string) => void;
}

export function MobileView(props: MobileViewProps) {
  const {
    sortedCodes,
    categories,
    codeUsageCounts,
    editingName,
    tempName,
    savingName,
    successAnimation,
    onStartEditingName,
    onSaveName,
    onCancelEditingName,
    onToggleWhitelist,
    onDelete,
    setTempName,
  } = props;

  return (
    <div className="md:hidden space-y-3 p-4">
      {sortedCodes.map(code => (
        <div
          key={code.id}
          className={`rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900 transition-colors ${
            successAnimation.has(code.id) ? 'animate-pulse bg-green-50 dark:bg-green-900/20' : ''
          }`}
        >
          {/* Code */}
          <div className="mb-3">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mb-1">Code:</div>
            {editingName === code.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={e => setTempName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') onSaveName(code.id);
                    if (e.key === 'Escape') onCancelEditingName();
                  }}
                  className="flex-1 px-2 py-1 text-sm border border-zinc-300 rounded bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  autoFocus
                />
                <button
                  onClick={() => onSaveName(code.id)}
                  disabled={savingName}
                  className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Save changes"
                >
                  {savingName ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => onCancelEditingName()}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                  title="Cancel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onStartEditingName(code)}
                  className="text-sm font-medium text-zinc-800 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 text-left flex-1 cursor-pointer"
                >
                  {code.name}
                </button>
                <button
                  onClick={() => onStartEditingName(code)}
                  className="text-zinc-400 hover:text-blue-500 transition p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
                  title="Edit code name"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Categories */}
          <div className="mb-3">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mb-1">
              Categories:
            </div>
            <div className="flex flex-wrap gap-1">
              {code.category_ids.length > 0 ? (
                code.category_ids.map(categoryId => {
                  const category = categories.find(c => c.id === categoryId);
                  return category ? (
                    <span
                      key={categoryId}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md dark:bg-blue-900/20 dark:text-blue-300"
                    >
                      {category.name}
                    </span>
                  ) : null;
                })
              ) : (
                <span className="text-zinc-500 dark:text-zinc-400 text-sm">—</span>
              )}
            </div>
          </div>

          {/* Whitelist */}
          <div className="mb-3">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mb-1">
              Whitelist:
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={code.is_whitelisted}
                onChange={e => onToggleWhitelist(code.id, e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {code.is_whitelisted ? 'Yes' : 'No'}
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {codeUsageCounts[code.id] && codeUsageCounts[code.id] > 0 ? (
              <button
                disabled
                className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded cursor-not-allowed"
                title={`Cannot delete: Used in ${codeUsageCounts[code.id]} answer${codeUsageCounts[code.id] !== 1 ? 's' : ''}`}
              >
                Delete
              </button>
            ) : (
              <button
                onClick={() => onDelete(code.id, code.name)}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer transition-colors"
                title="Delete this code"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
