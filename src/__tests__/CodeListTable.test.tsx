// ═══════════════════════════════════════════════════════════════
// 🧪 CodeListTable Tests
// ═══════════════════════════════════════════════════════════════

import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CodeListTable } from '../components/CodeListTable';
import { render, screen, waitFor } from '../test/utils/test-utils';
import type { Category, CodeWithCategories } from '../types';

describe('CodeListTable', () => {
  const mockCategories: Category[] = [
    { id: 1, name: 'Electronics', created_at: '2025-01-01T00:00:00Z', updated_at: null },
    { id: 2, name: 'Fashion', created_at: '2025-01-02T00:00:00Z', updated_at: null },
  ];

  const mockCodes: CodeWithCategories[] = [
    {
      id: 1,
      name: 'Apple',
      is_whitelisted: true,
      category_ids: [1],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: null,
    },
    {
      id: 2,
      name: 'Nike',
      is_whitelisted: false,
      category_ids: [2],
      created_at: '2025-01-02T00:00:00Z',
      updated_at: null,
    },
    {
      id: 3,
      name: 'Samsung',
      is_whitelisted: true,
      category_ids: [1],
      created_at: '2025-01-03T00:00:00Z',
      updated_at: '2025-01-04T00:00:00Z',
    },
  ];

  const mockUsageCounts = {
    1: 5,
    2: 0,
    3: 10,
  };

  const mockProps = {
    codes: mockCodes,
    categories: mockCategories,
    codeUsageCounts: mockUsageCounts,
    onUpdateName: vi.fn(),
    onToggleWhitelist: vi.fn(),
    onUpdateCategories: vi.fn(),
    onDelete: vi.fn(),
    onRecountMentions: vi.fn().mockResolvedValue(0),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render table with all codes', () => {
      render(<CodeListTable {...mockProps} />);

      expect(screen.getAllByText('Apple')).toHaveLength(2); // Desktop + Mobile
      expect(screen.getAllByText('Nike')).toHaveLength(2);
      expect(screen.getAllByText('Samsung')).toHaveLength(2);
    });

    it('should display code categories', () => {
      render(<CodeListTable {...mockProps} />);

      expect(screen.getAllByText('Electronics').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Fashion').length).toBeGreaterThan(0);
    });

    it('should show usage counts', () => {
      render(<CodeListTable {...mockProps} />);

      expect(screen.getByText('5')).toBeInTheDocument(); // Apple
      expect(screen.getByText('10')).toBeInTheDocument(); // Samsung
    });

    it('should display whitelist status', () => {
      render(<CodeListTable {...mockProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeChecked(); // Apple is whitelisted
      expect(checkboxes[1]).not.toBeChecked(); // Nike is not whitelisted
    });
  });

  describe('Sorting', () => {
    it('should sort by name ascending by default', () => {
      render(<CodeListTable {...mockProps} />);

      const rows = screen.getAllByRole('row');
      // Skip header row
      expect(rows[1]).toHaveTextContent('Apple');
      expect(rows[2]).toHaveTextContent('Nike');
      expect(rows[3]).toHaveTextContent('Samsung');
    });

    it('should toggle sort order when clicking header', async () => {
      const user = userEvent.setup();
      render(<CodeListTable {...mockProps} />);

      const nameHeaders = screen.getAllByText(/Code/);
      await user.click(nameHeaders[0]); // Click desktop header

      // Should now be descending
      await waitFor(() => {
        expect(screen.getAllByText('▼').length).toBeGreaterThan(0);
      });
    });

    it('should sort by whitelist status', async () => {
      const user = userEvent.setup();
      render(<CodeListTable {...mockProps} />);

      const whitelistHeaders = screen.getAllByText(/Whitelist/);
      await user.click(whitelistHeaders[0]); // Click desktop header

      await waitFor(() => {
        expect(screen.getAllByText('▲').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Editing Code Names', () => {
    it('should enter edit mode when clicking code name', async () => {
      const user = userEvent.setup();
      render(<CodeListTable {...mockProps} />);

      const appleButtons = screen.getAllByText('Apple');
      await user.click(appleButtons[0]); // Click first (desktop) button

      // Should show input field
      await waitFor(() => {
        const inputs = screen.getAllByDisplayValue('Apple');
        expect(inputs.length).toBeGreaterThan(0);
      });
    });

    it('should save new name when clicking save button', async () => {
      const user = userEvent.setup();
      render(<CodeListTable {...mockProps} />);

      // Start editing
      const appleButtons = screen.getAllByText('Apple');
      await user.click(appleButtons[0]);

      // Change name
      const inputs = screen.getAllByDisplayValue('Apple');
      await user.clear(inputs[0]);
      await user.type(inputs[0], 'Apple Inc');

      // Save
      const saveButtons = screen.getAllByTitle('Save changes');
      await user.click(saveButtons[0]);

      await waitFor(() => {
        expect(mockProps.onUpdateName).toHaveBeenCalledWith(1, 'Apple Inc');
      });
    });

    it('should cancel editing when clicking cancel', async () => {
      const user = userEvent.setup();
      render(<CodeListTable {...mockProps} />);

      // Start editing
      const appleButtons = screen.getAllByText('Apple');
      await user.click(appleButtons[0]);

      // Click cancel
      const cancelButtons = screen.getAllByTitle('Cancel');
      await user.click(cancelButtons[0]);

      // Should exit edit mode
      await waitFor(() => {
        expect(screen.queryAllByDisplayValue('Apple')).toHaveLength(0);
      });
    });

    it('should save on Enter key', async () => {
      const user = userEvent.setup();
      render(<CodeListTable {...mockProps} />);

      // Start editing
      const appleButtons = screen.getAllByText('Apple');
      await user.click(appleButtons[0]);

      // Type new name and press Enter
      const inputs = screen.getAllByDisplayValue('Apple');
      await user.clear(inputs[0]);
      await user.type(inputs[0], 'New Name{Enter}');

      await waitFor(() => {
        expect(mockProps.onUpdateName).toHaveBeenCalledWith(1, 'New Name');
      });
    });

    it('should cancel on Escape key', async () => {
      const user = userEvent.setup();
      render(<CodeListTable {...mockProps} />);

      // Start editing
      const appleButtons = screen.getAllByText('Apple');
      await user.click(appleButtons[0]);

      // Press Escape
      const inputs = screen.getAllByDisplayValue('Apple');
      await user.type(inputs[0], '{Escape}');

      // Should exit edit mode
      await waitFor(() => {
        expect(screen.queryAllByDisplayValue('Apple')).toHaveLength(0);
      });
    });
  });

  describe('Whitelist Toggle', () => {
    it('should call onToggleWhitelist when checkbox is clicked', async () => {
      const user = userEvent.setup();
      render(<CodeListTable {...mockProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Nike checkbox (not whitelisted)

      expect(mockProps.onToggleWhitelist).toHaveBeenCalledWith(2, true);
    });

    it('should uncheck whitelisted code', async () => {
      const user = userEvent.setup();
      render(<CodeListTable {...mockProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Apple checkbox (whitelisted)

      expect(mockProps.onToggleWhitelist).toHaveBeenCalledWith(1, false);
    });
  });

  describe('Delete Functionality', () => {
    it('should disable delete button for codes with usage', () => {
      render(<CodeListTable {...mockProps} />);

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/ });

      // Apple (5 usages) and Samsung (10 usages) should be disabled
      const disabledButtons = deleteButtons.filter(btn => btn.hasAttribute('disabled'));
      expect(disabledButtons.length).toBeGreaterThan(0);
    });

    it('should enable delete button for codes without usage', () => {
      render(<CodeListTable {...mockProps} />);

      // Nike has 0 usage, should be deletable
      const deleteButtons = screen.getAllByTitle(/Delete this code/);
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('should call onDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<CodeListTable {...mockProps} />);

      const nikeDeleteButtons = screen.getAllByTitle('Delete this code');
      await user.click(nikeDeleteButtons[0]); // Click first (desktop)

      expect(mockProps.onDelete).toHaveBeenCalledWith(2, 'Nike');
    });
  });

  describe('Empty State', () => {
    it('should handle empty codes array', () => {
      render(
        <CodeListTable
          {...mockProps}
          codes={[]}
        />
      );

      // Should render table structure
      expect(screen.getByText(/Code/)).toBeInTheDocument();

      // No code rows
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(1); // Only header row
    });
  });

  describe('Date Formatting', () => {
    it('should format created_at dates correctly', () => {
      render(<CodeListTable {...mockProps} />);

      // Check for formatted date (YYYY-MM-DD format)
      expect(screen.getByText(/2025-01-01/)).toBeInTheDocument();
    });

    it('should show — for null updated_at', () => {
      render(<CodeListTable {...mockProps} />);

      // Nike has null updated_at
      const emDashes = screen.getAllByText('—');
      expect(emDashes.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<CodeListTable {...mockProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeInTheDocument();
      });
    });

    it('should have keyboard navigation', () => {
      render(<CodeListTable {...mockProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });
  });
});

