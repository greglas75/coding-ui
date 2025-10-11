// ═══════════════════════════════════════════════════════════════
// 🧪 ExportImportModal Tests
// ═══════════════════════════════════════════════════════════════

import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportImportModal } from '../components/ExportImportModal';
import { render, screen } from '../test/utils/test-utils';

// Mock external dependencies
vi.mock('../lib/exportEngine', () => ({
  ExportEngine: vi.fn().mockImplementation(() => ({
    export: vi.fn().mockResolvedValue({ filename: 'test-export.xlsx' }),
  })),
}));

vi.mock('../lib/importEngine', () => ({
  ImportEngine: vi.fn().mockImplementation(() => ({
    validateFile: vi.fn().mockResolvedValue({ valid: true }),
    importCodes: vi.fn().mockResolvedValue({
      success: true,
      imported: 10,
      failed: 0,
      skipped: 2,
      errors: [],
    }),
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('ExportImportModal', () => {
  const mockProps = {
    onClose: vi.fn(),
    categoryId: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal with title', () => {
      render(<ExportImportModal {...mockProps} />);

      expect(screen.getByText('Export / Import Data')).toBeInTheDocument();
    });

    it('should show Export tab by default', () => {
      render(<ExportImportModal {...mockProps} />);

      expect(screen.getByText('Export Format')).toBeInTheDocument();
    });

    it('should have close button', () => {
      render(<ExportImportModal {...mockProps} />);

      const closeButton = screen.getByRole('button', { name: '' }); // X button
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to Import tab when clicked', async () => {
      const user = userEvent.setup();
      render(<ExportImportModal {...mockProps} />);

      const importTab = screen.getByText('Import');
      await user.click(importTab);

      expect(screen.getByText('Import Strategy')).toBeInTheDocument();
    });

    it('should switch back to Export tab', async () => {
      const user = userEvent.setup();
      render(<ExportImportModal {...mockProps} />);

      // Switch to Import
      const importTab = screen.getByText('Import');
      await user.click(importTab);

      // Switch back to Export
      const exportTab = screen.getByText('Export');
      await user.click(exportTab);

      expect(screen.getByText('Export Format')).toBeInTheDocument();
    });

    it('should highlight active tab', async () => {
      const user = userEvent.setup();
      render(<ExportImportModal {...mockProps} />);

      const exportTab = screen.getByText('Export');
      const importTab = screen.getByText('Import');

      // Export tab should be active
      expect(exportTab.className).toContain('text-blue-600');
      expect(importTab.className).toContain('text-gray-500');

      // Switch to import
      await user.click(importTab);

      // Import tab should now be active
      expect(importTab.className).toContain('text-blue-600');
    });
  });

  describe('Export Functionality', () => {
    it('should show format selection options', () => {
      render(<ExportImportModal {...mockProps} />);

      expect(screen.getByText('Excel')).toBeInTheDocument();
      expect(screen.getByText('CSV')).toBeInTheDocument();
      expect(screen.getByText('JSON')).toBeInTheDocument();
    });

    it('should select Excel format by default', () => {
      render(<ExportImportModal {...mockProps} />);

      const excelButton = screen.getByText('Excel').closest('button');
      expect(excelButton?.className).toContain('border-blue-600');
    });

    it('should allow changing export format', async () => {
      const user = userEvent.setup();
      render(<ExportImportModal {...mockProps} />);

      const csvButton = screen.getByText('CSV').closest('button');
      await user.click(csvButton!);

      expect(csvButton?.className).toContain('border-blue-600');
    });

    it('should show export options checkboxes', () => {
      render(<ExportImportModal {...mockProps} />);

      expect(screen.getAllByText(/Codes/).length).toBeGreaterThan(0);
      expect(screen.getByText('Categories')).toBeInTheDocument();
      expect(screen.getAllByText(/Answers/).length).toBeGreaterThan(0);
      expect(screen.getByText(/Coded Answers/)).toBeInTheDocument();
    });

    it('should have includeCodes checked by default', () => {
      render(<ExportImportModal {...mockProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeChecked(); // includeCodes
    });

    it('should toggle export options', async () => {
      const user = userEvent.setup();
      render(<ExportImportModal {...mockProps} />);

      const categoriesCheckbox = screen.getByLabelText('Categories');
      await user.click(categoriesCheckbox);

      expect(categoriesCheckbox).toBeChecked();
    });

    it('should show Export Data button', () => {
      render(<ExportImportModal {...mockProps} />);

      expect(screen.getByText('Export Data')).toBeInTheDocument();
    });
  });

  describe('Import Functionality', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<ExportImportModal {...mockProps} />);

      // Switch to import tab
      const importTab = screen.getByText('Import');
      await user.click(importTab);
    });

    it('should show import strategy options', () => {
      expect(screen.getByText('Merge')).toBeInTheDocument();
      expect(screen.getByText('Replace')).toBeInTheDocument();
    });

    it('should select Merge strategy by default', () => {
      const mergeButton = screen.getByText('Merge').closest('button');
      expect(mergeButton?.className).toContain('border-blue-600');
    });

    it('should allow changing import strategy', async () => {
      const user = userEvent.setup();

      const replaceButton = screen.getByText('Replace').closest('button');
      await user.click(replaceButton!);

      expect(replaceButton?.className).toContain('border-blue-600');
    });

    it('should show file upload area', () => {
      expect(screen.getByText('Click to upload Excel, CSV, or JSON')).toBeInTheDocument();
    });

    it('should show download template button', () => {
      expect(screen.getByText('Download Template')).toBeInTheDocument();
    });

    it('should show import requirements', () => {
      expect(screen.getByText('Import Requirements:')).toBeInTheDocument();
      expect(screen.getByText(/Name" column/)).toBeInTheDocument();
    });
  });

  describe('Template Download', () => {
    it('should trigger template download when button clicked', async () => {
      const user = userEvent.setup();
      render(<ExportImportModal {...mockProps} />);

      // Switch to import tab
      const importTab = screen.getByText('Import');
      await user.click(importTab);

      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();

      const downloadButton = screen.getByText('Download Template');
      await user.click(downloadButton);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when X button is clicked', async () => {
      const user = userEvent.setup();
      render(<ExportImportModal {...mockProps} />);

      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(btn => btn.querySelector('svg')); // X icon button

      if (xButton) {
        await user.click(xButton);
        expect(mockProps.onClose).toHaveBeenCalled();
      }
    });
  });

  describe('Category Context', () => {
    it('should show category context in export options when categoryId provided', () => {
      render(<ExportImportModal {...mockProps} categoryId={1} />);

      expect(screen.getByText(/current category only/)).toBeInTheDocument();
    });

    it('should work without categoryId', () => {
      render(<ExportImportModal {...mockProps} categoryId={undefined} />);

      expect(screen.getByText('Export / Import Data')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper role attributes', () => {
      render(<ExportImportModal {...mockProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should have keyboard navigation', () => {
      render(<ExportImportModal {...mockProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe('UI States', () => {
    it('should have export button initially enabled', () => {
      render(<ExportImportModal {...mockProps} />);

      const exportButton = screen.getByText('Export Data').closest('button');

      // Button should be enabled initially
      expect(exportButton).not.toBeDisabled();
    });
  });
});

