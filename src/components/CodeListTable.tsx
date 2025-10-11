import { useState } from 'react';
import type { Category, CodeWithCategories } from '../types';

interface CodeListTableProps {
  codes: CodeWithCategories[];
  categories: Category[];
  codeUsageCounts: Record<number, number>;
  onUpdateName: (id: number, name: string) => void;
  onToggleWhitelist: (id: number, isWhitelisted: boolean) => void;
  onUpdateCategories: (id: number, categoryIds: number[]) => void;
  onDelete: (id: number, name: string) => void;
  onRecountMentions: (codeName: string) => Promise<number>; // TODO: Implement recount functionality
}

export function CodeListTable({
  codes,
  categories,
  codeUsageCounts,
  onUpdateName,
  onToggleWhitelist,
  onUpdateCategories,
  onDelete,
  onRecountMentions: _onRecountMentions
}: CodeListTableProps) {
  const [editingName, setEditingName] = useState<number | null>(null);
  const [editingCategories, setEditingCategories] = useState<number | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempCategories, setTempCategories] = useState<number[]>([]);
  // TODO: Implement mentions/usage count feature
  const [_mentions, _setMentions] = useState<Map<number, number>>(new Map());
  const [_recounting, _setRecounting] = useState<Set<number>>(new Set());
  const [savingName, setSavingName] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<keyof CodeWithCategories | null>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Handle sorting
  const handleSort = (field: keyof CodeWithCategories) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Sort codes based on current sort settings
  const sortedCodes = [...codes].sort((a, b) => {
    if (!sortField) return 0;

    const aVal = a[sortField];
    const bVal = b[sortField];

    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
      return sortOrder === 'asc'
        ? (aVal === bVal ? 0 : aVal ? -1 : 1)
        : (aVal === bVal ? 0 : aVal ? 1 : -1);
    }

    return 0;
  });

  function startEditingName(code: CodeWithCategories) {
    setEditingName(code.id);
    setTempName(code.name);
  }

  async function saveName(codeId: number) {
    if (!tempName.trim()) return;

    if (tempName.trim().length > 100) {
      return; // Validation will be handled by parent component
    }

    setSavingName(true);
    try {
      await onUpdateName(codeId, tempName.trim());
      setEditingName(null);
      setTempName('');

      // Trigger success animation
      setSuccessAnimation(prev => new Set(prev).add(codeId));
      setTimeout(() => {
        setSuccessAnimation(prev => {
          const newSet = new Set(prev);
          newSet.delete(codeId);
          return newSet;
        });
      }, 1000);
    } catch (error) {
      console.error('Error saving code name:', error);
    } finally {
      setSavingName(false);
    }
  }

  function cancelEditingName() {
    setEditingName(null);
    setTempName('');
  }

  function startEditingCategories(code: CodeWithCategories) {
    setEditingCategories(code.id);
    setTempCategories([...code.category_ids]);
  }

  function saveCategories(codeId: number) {
    onUpdateCategories(codeId, tempCategories);
    setEditingCategories(null);
    setTempCategories([]);
  }

  function cancelEditingCategories() {
    setEditingCategories(null);
    setTempCategories([]);
  }

  function toggleCategory(categoryId: number) {
    setTempCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  }

  // TODO: Implement recount mentions functionality
  // async function _handleRecountMentions(codeId: number, codeName: string) {
  //   _setRecounting(prev => new Set(prev).add(codeId));
  //   try {
  //     const count = await onRecountMentions(codeName);
  //     _setMentions(prev => new Map(prev).set(codeId, count));
  //   } finally {
  //     _setRecounting(prev => {
  //       const newSet = new Set(prev);
  //       newSet.delete(codeId);
  //       return newSet;
  //     });
  //   }
  // }

  function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '');
  }

  return (
    <div className="relative overflow-auto max-h-[60vh]">
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <table className="w-full border-collapse min-w-[900px]">
          <thead className="sticky top-0 z-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border-b">
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th
                onClick={() => handleSort('name')}
                className="text-left px-3 py-2 w-auto text-xs font-medium uppercase tracking-wide text-zinc-500 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                title="Sort by code name"
              >
                Code {sortField === 'name' && <span className="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th className="text-left px-3 py-2 w-[200px] text-xs font-medium uppercase tracking-wide text-zinc-500">
                Categories
              </th>
              <th
                onClick={() => handleSort('is_whitelisted')}
                className="text-left px-3 py-2 w-[100px] text-xs font-medium uppercase tracking-wide text-zinc-500 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                title="Sort by whitelist status"
              >
                Whitelist {sortField === 'is_whitelisted' && <span className="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th className="text-left px-3 py-2 w-[120px] text-xs font-medium uppercase tracking-wide text-zinc-500">
                Mentions
              </th>
              <th
                onClick={() => handleSort('created_at')}
                className="text-left px-3 py-2 w-[120px] text-xs font-medium uppercase tracking-wide text-zinc-500 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                title="Sort by created date"
              >
                Added {sortField === 'created_at' && <span className="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th
                onClick={() => handleSort('updated_at')}
                className="text-left px-3 py-2 w-[120px] text-xs font-medium uppercase tracking-wide text-zinc-500 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                title="Sort by updated date"
              >
                Edited {sortField === 'updated_at' && <span className="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th className="text-left px-3 py-2 w-[100px] text-xs font-medium uppercase tracking-wide text-zinc-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCodes.map((code) => (
              <tr
                key={code.id}
                className={`group border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 bg-white dark:bg-zinc-900 transition-colors ${
                  successAnimation.has(code.id) ? 'animate-pulse bg-green-50 dark:bg-green-900/20' : ''
                }`}
              >
                {/* Name */}
                <td className="px-3 py-2">
                  {editingName === code.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveName(code.id);
                          if (e.key === 'Escape') cancelEditingName();
                        }}
                        className="flex-1 px-2 py-1 text-sm border border-zinc-300 rounded bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                        autoFocus
                      />
                      <button
                        onClick={() => saveName(code.id)}
                        disabled={savingName}
                        className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        title="Save changes"
                      >
                        {savingName ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => cancelEditingName()}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                        title="Cancel"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditingName(code)}
                        className="text-sm font-medium text-zinc-800 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 text-left flex-1 cursor-pointer"
                      >
                        {code.name}
                      </button>
                      <button
                        onClick={() => {
                          if (editingName === code.id) {
                            saveName(code.id);
                          } else {
                            startEditingName(code);
                          }
                        }}
                        disabled={savingName}
                        className={`transition p-1 rounded ${
                          editingName === code.id
                            ? 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 bg-green-100 dark:bg-green-900/20 opacity-100'
                            : 'text-zinc-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={editingName === code.id ? "Save changes" : "Edit code name"}
                      >
                        {editingName === code.id ? (
                          savingName ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </td>

                {/* Categories */}
                <td className="px-3 py-2">
                  {editingCategories === code.id ? (
                    <div className="space-y-2">
                      <div className="max-h-32 overflow-y-auto border border-zinc-300 rounded p-2 dark:border-zinc-600">
                        {categories.map(category => (
                          <label key={category.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={tempCategories.includes(category.id)}
                              onChange={() => toggleCategory(category.id)}
                              className="w-3 h-3"
                            />
                            {category.name}
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => saveCategories(code.id)}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditingCategories}
                          className="px-2 py-1 text-xs bg-zinc-600 text-white rounded hover:bg-zinc-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
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
                      <button
                        onClick={() => startEditingCategories(code)}
                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </td>

                {/* Whitelist */}
                <td className="px-3 py-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={code.is_whitelisted}
                      onChange={(e) => onToggleWhitelist(code.id, e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {code.is_whitelisted ? 'Yes' : 'No'}
                    </span>
                  </label>
                </td>

                {/* Mentions */}
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center">
                    {codeUsageCounts[code.id] !== undefined ? (
                      codeUsageCounts[code.id] > 0 ? (
                        <span
                          className="px-2 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded"
                          title={`Used in ${codeUsageCounts[code.id]} answer${codeUsageCounts[code.id] !== 1 ? 's' : ''}`}
                        >
                          {codeUsageCounts[code.id]}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-sm">0</span>
                      )
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                    )}
                  </div>
                </td>

                {/* Added */}
                <td className="px-3 py-2">
                  <span className="text-[11px] leading-tight text-zinc-500 dark:text-zinc-300 whitespace-nowrap">
                    {formatDate(code.created_at)}
                  </span>
                </td>

                {/* Edited */}
                <td className="px-3 py-2">
                  <span className="text-[11px] leading-tight text-zinc-500 dark:text-zinc-300 whitespace-nowrap">
                    {formatDate(code.updated_at)}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-3 py-2">
                  {codeUsageCounts[code.id] && codeUsageCounts[code.id] > 0 ? (
                    <button
                      disabled
                      className="px-2 py-1 text-xs bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded cursor-not-allowed"
                      title={`Cannot delete: Used in ${codeUsageCounts[code.id]} answer${codeUsageCounts[code.id] !== 1 ? 's' : ''}`}
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      onClick={() => onDelete(code.id, code.name)}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer transition-colors"
                      title="Delete this code"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 p-4">
        {sortedCodes.map((code) => (
          <div
            key={code.id}
            className={`rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900 transition-colors ${
              successAnimation.has(code.id) ? 'animate-pulse bg-green-50 dark:bg-green-900/20' : ''
            }`}
          >
            {/* Code */}
            <div className="mb-3">
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mb-1">
                Code:
              </div>
              {editingName === code.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveName(code.id);
                      if (e.key === 'Escape') cancelEditingName();
                    }}
                    className="flex-1 px-2 py-1 text-sm border border-zinc-300 rounded bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    autoFocus
                  />
                  <button
                    onClick={() => saveName(code.id)}
                    disabled={savingName}
                    className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save changes"
                  >
                    {savingName ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => cancelEditingName()}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                    title="Cancel"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEditingName(code)}
                    className="text-sm font-medium text-zinc-800 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 text-left flex-1 cursor-pointer"
                  >
                    {code.name}
                  </button>
                  <button
                    onClick={() => startEditingName(code)}
                    className="text-zinc-400 hover:text-blue-500 transition p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
                    title="Edit code name"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
                  onChange={(e) => onToggleWhitelist(code.id, e.target.checked)}
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
    </div>
  );
}
