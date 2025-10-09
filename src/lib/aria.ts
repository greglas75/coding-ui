/**
 * ♿ ARIA Utilities
 *
 * Helper functions for creating accessible interfaces.
 *
 * Benefits:
 * - Consistent ARIA labels across app
 * - Screen reader support
 * - Live region announcements
 * - WCAG 2.1 AA compliance
 */

/**
 * Generate accessible label for interactive elements
 *
 * Example:
 * ```tsx
 * getAriaLabel('delete', 'category', 'Fashion Brands')
 * // Returns: "Delete category Fashion Brands"
 * ```
 */
export function getAriaLabel(
  action: string,
  target: string,
  context?: string
): string {
  if (context) {
    return `${action} ${target} ${context}`;
  }
  return `${action} ${target}`;
}

/**
 * Common ARIA labels for buttons and actions
 *
 * Usage:
 * ```tsx
 * <button aria-label={ARIA_LABELS.delete('category')}>
 *   <TrashIcon />
 * </button>
 * ```
 */
export const ARIA_LABELS = {
  // Actions
  add: (item: string) => `Add ${item}`,
  edit: (item: string) => `Edit ${item}`,
  delete: (item: string) => `Delete ${item}`,
  save: (item: string) => `Save ${item}`,
  cancel: () => 'Cancel',
  close: () => 'Close',
  confirm: () => 'Confirm',

  // Navigation
  next: () => 'Next page',
  previous: () => 'Previous page',
  first: () => 'First page',
  last: () => 'Last page',
  goTo: (destination: string) => `Go to ${destination}`,

  // Selection
  select: (item: string) => `Select ${item}`,
  selectAll: () => 'Select all items',
  deselectAll: () => 'Deselect all items',
  toggleSelection: (item: string) => `Toggle selection for ${item}`,

  // Filters
  search: () => 'Search',
  filter: (by: string) => `Filter by ${by}`,
  clearFilters: () => 'Clear all filters',
  resetFilters: () => 'Reset filters to default',
  applyFilters: () => 'Apply filters',

  // Status
  loading: (what?: string) => what ? `Loading ${what}` : 'Loading content',
  success: (action?: string) => action ? `${action} successful` : 'Action completed successfully',
  error: (action?: string) => action ? `${action} failed` : 'An error occurred',

  // Sorting
  sort: (column: string, order: 'asc' | 'desc') => `Sort ${column} ${order === 'asc' ? 'ascending' : 'descending'}`,
  sortable: (column: string) => `${column} column, sortable`,

  // Bulk actions
  bulkAction: (action: string, count: number) => `${action} ${count} selected ${count === 1 ? 'item' : 'items'}`,

  // Modals
  openModal: (name: string) => `Open ${name} modal`,
  closeModal: (name: string) => `Close ${name} modal`,
};

/**
 * Live region announcer for screen readers
 *
 * Announces dynamic content changes to screen readers.
 *
 * Usage:
 * ```tsx
 * import { announcer } from '@/lib/aria';
 *
 * // After successful action
 * announcer.announce('Category added successfully');
 *
 * // For urgent announcements
 * announcer.announce('Error: Connection lost', 'assertive');
 * ```
 */
export class LiveAnnouncer {
  private static instance: LiveAnnouncer;
  private element: HTMLDivElement | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.element = document.createElement('div');
      this.element.setAttribute('role', 'status');
      this.element.setAttribute('aria-live', 'polite');
      this.element.setAttribute('aria-atomic', 'true');
      this.element.className = 'sr-only';
      document.body.appendChild(this.element);
    }
  }

  static getInstance(): LiveAnnouncer {
    if (!LiveAnnouncer.instance) {
      LiveAnnouncer.instance = new LiveAnnouncer();
    }
    return LiveAnnouncer.instance;
  }

  /**
   * Announce message to screen readers
   *
   * @param message - Message to announce
   * @param priority - 'polite' (default) or 'assertive' (interrupts)
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.element) return;

    // Update aria-live priority
    this.element.setAttribute('aria-live', priority);

    // Clear first (ensures change is detected)
    this.element.textContent = '';

    // Announce message
    setTimeout(() => {
      if (this.element) {
        this.element.textContent = message;
      }
    }, 100);

    // Clear after announcement
    setTimeout(() => {
      if (this.element) {
        this.element.textContent = '';
      }
    }, 1000);
  }

  /**
   * Announce multiple messages in sequence
   */
  announceSequence(messages: string[], priority: 'polite' | 'assertive' = 'polite') {
    messages.forEach((message, index) => {
      setTimeout(() => {
        this.announce(message, priority);
      }, index * 1500);
    });
  }
}

// Export singleton instance
export const announcer = LiveAnnouncer.getInstance();

/**
 * React hook for live announcements
 *
 * Usage:
 * ```tsx
 * const announce = useAnnouncer();
 * announce('Category added successfully');
 * ```
 */
export function useAnnouncer() {
  return (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announcer.announce(message, priority);
  };
}

/**
 * Generate accessible description for complex widgets
 */
export function getAriaDescription(type: string, state: Record<string, any>): string {
  switch (type) {
    case 'dropdown':
      return `Dropdown menu, ${state.isOpen ? 'expanded' : 'collapsed'}, ${state.itemCount} options available`;

    case 'table':
      return `Table with ${state.rows} rows and ${state.columns} columns`;

    case 'pagination':
      return `Page ${state.current} of ${state.total}, showing ${state.itemsOnPage} items`;

    case 'filter':
      return `${state.activeCount} filters active, ${state.resultCount} results`;

    default:
      return '';
  }
}
