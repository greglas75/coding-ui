/**
 * useAdvancedFilters Hook
 *
 * Manages advanced filtering features:
 * - Filter groups and presets
 * - Advanced search term
 * - Filter engine instance
 */

import { useState, useCallback } from 'react';
import { FilterEngine, type FilterGroup, type FilterPreset } from '../../../lib/filterEngine';
import { loadFilterPresets, saveFilterPresets } from '../utils/filterPresets';
import { simpleLogger } from '../../../utils/logger';

interface UseAdvancedFiltersReturn {
  // Filter state
  filterGroup: FilterGroup;
  setFilterGroup: React.Dispatch<React.SetStateAction<FilterGroup>>;
  filterPresets: FilterPreset[];
  advancedSearchTerm: string;
  setAdvancedSearchTerm: React.Dispatch<React.SetStateAction<string>>;

  // Filter engine
  filterEngine: FilterEngine;

  // Preset handlers
  handleSavePreset: (name: string) => void;
  handleLoadPreset: (preset: FilterPreset) => void;
  handleDeletePreset: (id: string) => void;
}

export function useAdvancedFilters(): UseAdvancedFiltersReturn {
  // Filter group state
  const [filterGroup, setFilterGroup] = useState<FilterGroup>({
    logic: 'AND',
    filters: [],
  });

  // Filter presets
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>(() => {
    // Load presets from localStorage on mount
    return loadFilterPresets();
  });

  // Advanced search term
  const [advancedSearchTerm, setAdvancedSearchTerm] = useState('');

  // Filter engine instance (stable across renders)
  const [filterEngine] = useState(() => new FilterEngine());

  // Save current filter group as a preset
  const handleSavePreset = useCallback(
    (name: string) => {
      const newPreset: FilterPreset = {
        id: `preset-${Date.now()}`,
        name,
        filterGroup,
        createdAt: new Date().toISOString(),
      };

      const updatedPresets = [...filterPresets, newPreset];
      setFilterPresets(updatedPresets);
      saveFilterPresets(updatedPresets);

      simpleLogger.info('✅ Saved filter preset:', name);
    },
    [filterGroup, filterPresets]
  );

  // Load a preset and apply it
  const handleLoadPreset = useCallback((preset: FilterPreset) => {
    setFilterGroup(preset.filterGroup);
    simpleLogger.info('✅ Loaded filter preset:', preset.name);
  }, []);

  // Delete a preset
  const handleDeletePreset = useCallback(
    (id: string) => {
      const updatedPresets = filterPresets.filter(p => p.id !== id);
      setFilterPresets(updatedPresets);
      saveFilterPresets(updatedPresets);

      simpleLogger.info('✅ Deleted filter preset:', id);
    },
    [filterPresets]
  );

  return {
    filterGroup,
    setFilterGroup,
    filterPresets,
    advancedSearchTerm,
    setAdvancedSearchTerm,
    filterEngine,
    handleSavePreset,
    handleLoadPreset,
    handleDeletePreset,
  };
}
