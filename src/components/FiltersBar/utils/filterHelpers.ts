import { getStatusLabel, normalizeStatus } from '../../../lib/statusNormalization';
import type { FiltersType } from '../types';

/**
 * Oczyszcza nazwę statusu (usuwa prefix FIXED_, zamienia _ na spacje, capitalize)
 */
export function cleanStatusName(status: string): string {
  return status
    .replace(/^FIXED_/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Mapowanie kodów języków na pełne nazwy
 */
export const languageNames: Record<string, string> = {
  pl: 'Polski',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  ru: 'Русский',
  uk: 'Українська',
  cs: 'Čeština',
  sk: 'Slovenčina',
  ro: 'Română',
  hu: 'Magyar',
  bg: 'Български',
  hr: 'Hrvatski',
  sr: 'Српски',
  sl: 'Slovenščina',
  lt: 'Lietuvių',
  lv: 'Latviešu',
  et: 'Eesti',
  ar: 'Arabic',
  fa: 'Farsi',
  id: 'Indonesian',
  ur: 'Urdu',
  vi: 'Vietnamese',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  hi: 'Hindi',
  th: 'Thai',
  tr: 'Turkish',
  nl: 'Dutch',
  sv: 'Swedish',
  no: 'Norwegian',
  da: 'Danish',
  fi: 'Finnish'
};

/**
 * Mapowanie kodów krajów na pełne nazwy
 */
export const countryNames: Record<string, string> = {
  PL: 'Polska',
  DE: 'Niemcy',
  FR: 'Francja',
  GB: 'Wielka Brytania',
  US: 'Stany Zjednoczone',
  ES: 'Hiszpania',
  IT: 'Włochy',
  PT: 'Portugalia',
  RU: 'Rosja',
  UA: 'Ukraina',
  CZ: 'Czechy',
  SK: 'Słowacja',
  RO: 'Rumunia',
  HU: 'Węgry',
  BG: 'Bułgaria',
  HR: 'Chorwacja',
  RS: 'Serbia',
  SI: 'Słowenia',
  LT: 'Litwa',
  LV: 'Łotwa',
  EE: 'Estonia',
  AT: 'Austria',
  CH: 'Szwajcaria',
  BE: 'Belgia',
  NL: 'Holandia',
  DK: 'Dania',
  SE: 'Szwecja',
  NO: 'Norwegia',
  FI: 'Finlandia'
};

/**
 * Łączy i deduplikuje opcje statusów
 */
export function mergeStatusOptions(
  statusesList: string[],
  typesList: Array<{ key: string; label: string }>
): Array<{ key: string; label: string }> {
  const optionMap = new Map<string, { key: string; label: string }>();

  typesList.forEach(option => {
    try {
      const canonicalKey = normalizeStatus(option.key);
      const displayLabel = getStatusLabel(canonicalKey);
      optionMap.set(canonicalKey, { key: canonicalKey, label: displayLabel });
    } catch (e) {
      console.warn('Unknown status:', option.key);
      optionMap.set(option.key, { key: option.key, label: option.label });
    }
  });

  statusesList.forEach(status => {
    try {
      const canonicalKey = normalizeStatus(status);
      if (!optionMap.has(canonicalKey)) {
        const displayLabel = getStatusLabel(canonicalKey);
        optionMap.set(canonicalKey, { key: canonicalKey, label: displayLabel });
      }
    } catch (e) {
      console.warn('Unknown status:', status);
      if (!optionMap.has(status)) {
        optionMap.set(status, { key: status, label: cleanStatusName(status) });
      }
    }
  });

  return Array.from(optionMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'en', { sensitivity: 'base' })
  );
}

/**
 * Zwraca tekst do wyświetlenia w dropdown button
 */
export function getDisplayText(
  key: string,
  multiSelect: boolean,
  filters: FiltersType
): string {
  const value = filters[key as keyof FiltersType];

  if (multiSelect && Array.isArray(value)) {
    return value.length === 0 ? `All ${key}` : `${value.length} selected`;
  }

  if (!multiSelect && value) {
    return value as string;
  }

  return `All ${key}`;
}

/**
 * Sprawdza czy filtry są puste
 */
export function areFiltersEmpty(filters: FiltersType): boolean {
  return (
    !filters.search &&
    (!filters.status || filters.status.length === 0) &&
    (!filters.codes || filters.codes.length === 0) &&
    !filters.language &&
    !filters.country &&
    (!filters.minLength || filters.minLength === 0) &&
    (!filters.maxLength || filters.maxLength === 0)
  );
}

/**
 * Tworzy pusty obiekt filtrów
 */
export function createEmptyFilters(): FiltersType {
  return {
    search: '',
    status: [],
    codes: [],
    language: '',
    country: '',
    minLength: 0,
    maxLength: 0
  };
}

/**
 * Liczy aktywne filtry
 */
export function countActiveFilters(filters: FiltersType): number {
  let count = 0;

  if (filters.search) count++;
  if (filters.status && filters.status.length > 0) count += filters.status.length;
  if (filters.codes && filters.codes.length > 0) count += filters.codes.length;
  if (filters.language) count++;
  if (filters.country) count++;
  if (filters.minLength && filters.minLength > 0) count++;
  if (filters.maxLength && filters.maxLength > 0) count++;

  return count;
}
