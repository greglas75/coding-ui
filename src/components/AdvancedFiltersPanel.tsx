import { useState } from 'react';
import { Plus, X, Save, Star, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import type { Filter as FilterType, FilterGroup, FilterPreset } from '../lib/filterEngine';
import { FilterEngine } from '../lib/filterEngine';

interface Props {
  filterGroup: FilterGroup;
  onFilterChange: (filterGroup: FilterGroup) => void;
  presets: FilterPreset[];
  onSavePreset: (name: string) => void;
  onLoadPreset: (preset: FilterPreset) => void;
  onDeletePreset: (presetId: string) => void;
  resultsCount: number;
  totalCount: number;
  onSearchChange?: (searchTerm: string) => void;
}

export function AdvancedFiltersPanel({
  filterGroup,
  onFilterChange,
  presets,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  resultsCount,
  totalCount,
  onSearchChange
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState('');

  const filterEngine = new FilterEngine();

  const addFilter = () => {
    const newFilter = filterEngine.createDefaultFilter();
    onFilterChange({
      ...filterGroup,
      filters: [...filterGroup.filters, newFilter]
    });
    setIsExpanded(true);
  };

  const removeFilter = (filterId: string) => {
    onFilterChange({
      ...filterGroup,
      filters: filterGroup.filters.filter(f => f.id !== filterId)
    });
  };

  const updateFilter = (filterId: string, updates: Partial<FilterType>) => {
    onFilterChange({
      ...filterGroup,
      filters: filterGroup.filters.map(f =>
        f.id === filterId ? { ...f, ...updates } : f
      )
    });
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    onSavePreset(presetName);
    setPresetName('');
    setSavingPreset(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onSearchChange?.(value);
  };

  const clearAllFilters = () => {
    onFilterChange({
      logic: 'AND',
      filters: []
    });
    setSearchTerm('');
    onSearchChange?.('');
  };

  return (
    <div className="border border-gray-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Filter size={16} />
            Advanced Filters
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* Results Count */}
          <div className="text-xs">
            <span className="font-semibold text-gray-900 dark:text-white">{resultsCount}</span>
            <span className="text-gray-500 dark:text-gray-400"> of {totalCount} answers</span>
          </div>

          {/* Active Filters Badge */}
          {filterGroup.filters.length > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
              {filterGroup.filters.length} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Logic Toggle */}
          {filterGroup.filters.length > 1 && (
            <button
              onClick={() => onFilterChange({ ...filterGroup, logic: filterGroup.logic === 'AND' ? 'OR' : 'AND' })}
              className={`px-2 py-1 text-xs font-semibold rounded transition-colors ${
                filterGroup.logic === 'AND'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-200'
                  : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 hover:bg-purple-200'
              }`}
              title={`Switch to ${filterGroup.logic === 'AND' ? 'OR' : 'AND'} logic`}
            >
              {filterGroup.logic}
            </button>
          )}

          {/* Clear All */}
          {(filterGroup.filters.length > 0 || searchTerm) && (
            <button
              onClick={clearAllFilters}
              className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
            >
              Clear All
            </button>
          )}

          {/* Add Filter */}
          <button
            onClick={addFilter}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded transition-colors"
            title="Add filter"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Search Bar (always visible) */}
      <div className="p-4 border-b border-gray-200 dark:border-neutral-800">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search in answers..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Filter Presets */}
          {presets.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                <Star size={12} className="text-yellow-500" />
                Saved Presets
              </div>
              <div className="flex flex-wrap gap-2">
                {presets.map(preset => (
                  <div
                    key={preset.id}
                    className="group relative"
                  >
                    <button
                      onClick={() => onLoadPreset(preset)}
                      className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors flex items-center gap-1.5"
                    >
                      <Star size={12} className="text-yellow-500" />
                      {preset.name}
                    </button>
                    <button
                      onClick={() => onDeletePreset(preset.id)}
                      className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all"
                      title="Delete preset"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Individual Filters */}
          {filterGroup.filters.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Filters {filterGroup.filters.length > 1 && `(${filterGroup.logic} logic)`}
              </div>
              {filterGroup.filters.map((filter, index) => (
                <div key={filter.id} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg">
                  {/* Filter Number */}
                  <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-neutral-700 rounded-full">
                    {index + 1}
                  </div>

                  {/* Field Select */}
                  <select
                    value={filter.field}
                    onChange={(e) => updateFilter(filter.id, { field: e.target.value as any })}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="text">Text</option>
                    <option value="code">Code</option>
                    <option value="status">Status</option>
                    <option value="date">Date</option>
                    <option value="category">Category</option>
                    <option value="assignedBy">Assigned By</option>
                  </select>

                  {/* Operator Select */}
                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(filter.id, { operator: e.target.value as any })}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="contains">Contains</option>
                    <option value="equals">Equals</option>
                    <option value="startsWith">Starts with</option>
                    <option value="endsWith">Ends with</option>
                    <option value="in">Is one of</option>
                    <option value="notIn">Is not one of</option>
                    {filter.field === 'date' && (
                      <>
                        <option value="before">Before</option>
                        <option value="after">After</option>
                        <option value="between">Between</option>
                      </>
                    )}
                  </select>

                  {/* Value Input */}
                  <input
                    type={filter.field === 'date' ? 'date' : 'text'}
                    value={filter.value}
                    onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                    placeholder="Value..."
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFilter(filter.id)}
                    className="flex-shrink-0 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
                    title="Remove filter"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {filterGroup.filters.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Filter size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No filters added yet</p>
              <p className="text-xs mt-1">Click the + button to add a filter</p>
            </div>
          )}

          {/* Save Preset */}
          {filterGroup.filters.length > 0 && (
            <div className="pt-3 border-t border-gray-200 dark:border-neutral-800">
              {savingPreset ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                    placeholder="Preset name..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    onClick={handleSavePreset}
                    disabled={!presetName.trim()}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setSavingPreset(false);
                      setPresetName('');
                    }}
                    className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSavingPreset(true)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1.5 transition-colors"
                >
                  <Save size={14} />
                  Save as preset
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Active Filters Chips (when collapsed) */}
      {filterGroup.filters.length > 0 && !isExpanded && (
        <div className="px-4 py-3 flex flex-wrap gap-2">
          {filterGroup.filters.map(filter => (
            <div
              key={filter.id}
              className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full flex items-center gap-1.5"
            >
              <span>{filterEngine.getFilterSummary(filter)}</span>
              <button
                onClick={() => removeFilter(filter.id)}
                className="hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
