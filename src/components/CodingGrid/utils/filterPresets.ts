import { toast } from 'sonner';
import type { FilterGroup, FilterPreset } from '../../../lib/filterEngine';

const PRESETS_STORAGE_KEY = 'filterPresets';

/**
 * Load filter presets from localStorage
 */
export function loadFilterPresets(): FilterPreset[] {
  const saved = localStorage.getItem(PRESETS_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error('Failed to load filter presets:', error);
      return [];
    }
  }
  return [];
}

/**
 * Save filter presets to localStorage
 */
export function saveFilterPresets(presets: FilterPreset[]): void {
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
}

/**
 * Save a new filter preset
 */
export function saveFilterPreset(
  presets: FilterPreset[],
  name: string,
  filterGroup: FilterGroup
): FilterPreset[] {
  const newPreset: FilterPreset = {
    id: crypto.randomUUID(),
    name,
    filterGroup,
    createdAt: new Date().toISOString(),
  };

  const newPresets = [...presets, newPreset];
  saveFilterPresets(newPresets);
  toast.success(`Filter preset "${name}" saved!`);
  return newPresets;
}

/**
 * Delete a filter preset
 */
export function deleteFilterPreset(presets: FilterPreset[], presetId: string): FilterPreset[] {
  const newPresets = presets.filter((p) => p.id !== presetId);
  saveFilterPresets(newPresets);
  toast.success('Filter preset deleted');
  return newPresets;
}

