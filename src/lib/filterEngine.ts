import { simpleLogger } from '../utils/logger';

export interface Filter {
  id: string;
  field: 'code' | 'status' | 'text' | 'date' | 'category' | 'assignedBy';
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn' | 'before' | 'after' | 'between';
  value: any;
}

export interface FilterGroup {
  logic: 'AND' | 'OR';
  filters: Filter[];
}

export interface FilterPreset {
  id: string;
  name: string;
  filterGroup: FilterGroup;
  createdAt: string;
}

export class FilterEngine {
  /**
   * Apply filters to answers array
   */
  async applyFilters(
    answers: any[],
    filterGroup: FilterGroup
  ): Promise<any[]> {
    if (filterGroup.filters.length === 0) {
      return answers;
    }

    simpleLogger.info(`🔍 Applying ${filterGroup.filters.length} filters with ${filterGroup.logic} logic`);

    return answers.filter(answer => {
      const results = filterGroup.filters.map(filter =>
        this.evaluateFilter(answer, filter)
      );

      if (filterGroup.logic === 'AND') {
        return results.every(r => r);
      } else {
        return results.some(r => r);
      }
    });
  }

  /**
   * Evaluate single filter against answer
   */
  private evaluateFilter(answer: any, filter: Filter): boolean {
    const fieldValue = this.getFieldValue(answer, filter.field);

    switch (filter.operator) {
      case 'equals':
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(filter.value);
        }
        return fieldValue === filter.value;

      case 'contains':
        if (Array.isArray(fieldValue)) {
          return fieldValue.some(v =>
            String(v).toLowerCase().includes(String(filter.value).toLowerCase())
          );
        }
        return String(fieldValue || '').toLowerCase().includes(String(filter.value).toLowerCase());

      case 'startsWith':
        return String(fieldValue || '').toLowerCase().startsWith(String(filter.value).toLowerCase());

      case 'endsWith':
        return String(fieldValue || '').toLowerCase().endsWith(String(filter.value).toLowerCase());

      case 'in':
        if (Array.isArray(filter.value)) {
          if (Array.isArray(fieldValue)) {
            return filter.value.some(v => fieldValue.includes(v));
          }
          return filter.value.includes(fieldValue);
        }
        return false;

      case 'notIn':
        if (Array.isArray(filter.value)) {
          if (Array.isArray(fieldValue)) {
            return !filter.value.some(v => fieldValue.includes(v));
          }
          return !filter.value.includes(fieldValue);
        }
        return true;

      case 'before':
        if (!fieldValue) return false;
        return new Date(fieldValue) < new Date(filter.value);

      case 'after':
        if (!fieldValue) return false;
        return new Date(fieldValue) > new Date(filter.value);

      case 'between':
        if (!fieldValue || !Array.isArray(filter.value) || filter.value.length !== 2) return false;
        const date = new Date(fieldValue);
        return (
          date >= new Date(filter.value[0]) &&
          date <= new Date(filter.value[1])
        );

      default:
        return true;
    }
  }

  /**
   * Get field value from answer
   */
  private getFieldValue(answer: any, field: string): any {
    switch (field) {
      case 'code':
        // Return selected code name
        return answer.selected_code || null;
      case 'status':
        return answer.general_status;
      case 'text':
        return answer.answer_text || answer.original_text;
      case 'date':
        return answer.coding_date || answer.created_at;
      case 'category':
        return answer.category_id;
      case 'assignedBy':
        return answer.assigned_by || answer.confirmed_by;
      default:
        return null;
    }
  }

  /**
   * Highlight search term in text
   */
  highlightMatches(text: string, searchTerm: string): string {
    if (!searchTerm || !text) return text;

    const regex = new RegExp(`(${this.escapeRegex(searchTerm)})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 px-0.5 rounded">$1</mark>');
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get filter summary text
   */
  getFilterSummary(filter: Filter): string {
    let summary = `${filter.field} ${filter.operator}`;

    if (Array.isArray(filter.value)) {
      summary += ` [${filter.value.join(', ')}]`;
    } else {
      summary += ` "${filter.value}"`;
    }

    return summary;
  }

  /**
   * Validate filter
   */
  validateFilter(filter: Filter): { valid: boolean; error?: string } {
    if (!filter.field) {
      return { valid: false, error: 'Field is required' };
    }

    if (!filter.operator) {
      return { valid: false, error: 'Operator is required' };
    }

    if (filter.value === null || filter.value === undefined || filter.value === '') {
      return { valid: false, error: 'Value is required' };
    }

    if (filter.operator === 'between' && (!Array.isArray(filter.value) || filter.value.length !== 2)) {
      return { valid: false, error: 'Between operator requires two values' };
    }

    return { valid: true };
  }

  /**
   * Create default filter
   */
  createDefaultFilter(): Filter {
    return {
      id: crypto.randomUUID(),
      field: 'text',
      operator: 'contains',
      value: ''
    };
  }
}
