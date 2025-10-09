export interface FiltersType {
  search: string;
  status: string[];
  codes: string[];
  language: string;
  country: string;
  minLength: number;
  maxLength: number;
}

export interface FilterOption {
  key: string;
  label: string;
  count?: number;
}

export interface DropdownConfig {
  key: string;
  label: string;
  options: FilterOption[];
  multiSelect: boolean;
}
