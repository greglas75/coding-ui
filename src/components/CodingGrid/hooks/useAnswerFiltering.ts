import { useMemo, useState } from 'react';
import { useDebounce } from '../../../hooks/useDebounce';
import type { Answer } from '../../../types';

export function useAnswerFiltering(
  answers: Answer[],
  filters: any,
  filterGroup: any,
  advancedSearchTerm: string
) {
  const [sortField, setSortField] = useState<keyof Answer | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const debouncedSearch = useDebounce(filters.search, 250);

  // Basic filtering
  const filteredAnswers = useMemo(() => {
    return answers.filter(answer => {
      if (filters.status.length > 0) {
        const answerStatus = answer.general_status || '';
        const isMatched = filters.status.some((filterStatus: string) =>
          filterStatus.toLowerCase() === answerStatus.toLowerCase()
        );
        if (!isMatched) return false;
      }

      if (filters.language && answer.language !== filters.language) {
        return false;
      }

      if (filters.country && answer.country !== filters.country) {
        return false;
      }

      if (filters.codes.length > 0 && answer.selected_code) {
        const hasCode = filters.codes.some((code: string) =>
          answer.selected_code?.toLowerCase().includes(code.toLowerCase())
        );
        if (!hasCode) return false;
      }

      if (debouncedSearch && answer.answer_text &&
          !answer.answer_text.toLowerCase().includes(debouncedSearch.toLowerCase())) {
        return false;
      }

      if (filters.minLength > 0 && answer.answer_text &&
          answer.answer_text.length < filters.minLength) {
        return false;
      }

      if (filters.maxLength > 0 && answer.answer_text &&
          answer.answer_text.length > filters.maxLength) {
        return false;
      }

      return true;
    });
  }, [answers, filters, debouncedSearch]);

  // Advanced filtering + sorting
  const sortedAndFilteredAnswers = useMemo(() => {
    let results = [...filteredAnswers];

    // Advanced filters
    if (filterGroup.filters.length > 0) {
      results = results.filter(answer => {
        const filterResults = filterGroup.filters.map((filter: any) => {
          let fieldValue: any;
          switch (filter.field) {
            case 'text': fieldValue = answer.answer_text; break;
            case 'code': fieldValue = answer.selected_code; break;
            case 'status': fieldValue = answer.general_status; break;
            case 'date': fieldValue = answer.coding_date || answer.created_at; break;
            case 'category': fieldValue = answer.category_id; break;
            default: fieldValue = null;
          }

          switch (filter.operator) {
            case 'contains':
              return String(fieldValue || '').toLowerCase().includes(String(filter.value).toLowerCase());
            case 'equals':
              return fieldValue === filter.value;
            case 'startsWith':
              return String(fieldValue || '').toLowerCase().startsWith(String(filter.value).toLowerCase());
            default:
              return true;
          }
        });

        return filterGroup.logic === 'AND'
          ? filterResults.every((r: boolean) => r)
          : filterResults.some((r: boolean) => r);
      });
    }

    // Advanced search (searches in answer text, translation, and codes)
    if (advancedSearchTerm) {
      results = results.filter(answer =>
        answer.answer_text?.toLowerCase().includes(advancedSearchTerm.toLowerCase()) ||
        answer.translation_en?.toLowerCase().includes(advancedSearchTerm.toLowerCase()) ||
        answer.selected_code?.toLowerCase().includes(advancedSearchTerm.toLowerCase())
      );
    }

    // Sort
    return results.sort((a, b) => {
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

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }, [filteredAnswers, sortField, sortOrder, filterGroup, advancedSearchTerm]);

  const handleSort = (field: keyof Answer) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return {
    filteredAnswers,
    sortedAndFilteredAnswers,
    sortField,
    sortOrder,
    handleSort,
  };
}
