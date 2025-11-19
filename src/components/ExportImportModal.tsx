import { Download, FileJson, FileSpreadsheet, FileText, Upload, X } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { ExportEngine, type ExportOptions } from '../lib/exportEngine';
import { ImportEngine } from '../lib/importEngine';
import { simpleLogger } from '../utils/logger';

interface Props {
  onClose: () => void;
  categoryId?: number;
}

export function ExportImportModal({ onClose, categoryId }: Props) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    includeCodes: true,
    includeCategories: false,
    includeAnswers: false,
    includeCodedAnswers: false,
    categoryId,
  });
  const [importStrategy, setImportStrategy] = useState<'merge' | 'replace'>('merge');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportEngine = new ExportEngine();
  const importEngine = new ImportEngine();

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await exportEngine.export(exportOptions);
      toast.success(`Exported to ${result.filename}`);
    } catch (error) {
      simpleLogger.error('Export error:', error);
      toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      // Validate file first
      const validation = await importEngine.validateFile(file);
      if (!validation.valid) {
        toast.error(`Invalid file: ${validation.error}`);
        return;
      }

      const result = await importEngine.importCodes(file, importStrategy, categoryId);

      if (result.success) {
        const message = `Imported ${result.imported} codes.${result.failed > 0 ? ` Failed: ${result.failed}.` : ''}${result.skipped > 0 ? ` Skipped: ${result.skipped}.` : ''}`;
        toast.success(message);

        if (result.errors.length > 0) {
          simpleLogger.error('Import errors:', result.errors);
          toast.warning(`${result.errors.length} errors occurred. Check console for details.`);
        }

        // Refresh page after successful import
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error('Import failed. Check console for details.');
        simpleLogger.error('Import errors:', result.errors);
      }
    } catch (error) {
      simpleLogger.error('Import error:', error);
      toast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
      e.target.value = ''; // Reset input
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      { Name: 'Example Code 1' },
      { Name: 'Example Code 2' },
      { Name: 'Example Code 3' },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Codes Template');

    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'codes-template.xlsx';
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Template downloaded');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Export / Import Data
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-neutral-800">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'export'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Download size={16} className="inline mr-2" />
            Export
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'import'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Upload size={16} className="inline mr-2" />
            Import
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'export' ? (
            <div className="space-y-6">
              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Export Format
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setExportOptions({ ...exportOptions, format: 'excel' })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      exportOptions.format === 'excel'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 dark:border-neutral-800 hover:border-gray-300'
                    }`}
                  >
                    <FileSpreadsheet size={24} className="mx-auto mb-2 text-green-600" />
                    <div className="text-sm font-medium">Excel</div>
                    <div className="text-xs text-gray-500">.xlsx</div>
                  </button>

                  <button
                    onClick={() => setExportOptions({ ...exportOptions, format: 'csv' })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      exportOptions.format === 'csv'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 dark:border-neutral-800 hover:border-gray-300'
                    }`}
                  >
                    <FileText size={24} className="mx-auto mb-2 text-blue-600" />
                    <div className="text-sm font-medium">CSV</div>
                    <div className="text-xs text-gray-500">.csv</div>
                  </button>

                  <button
                    onClick={() => setExportOptions({ ...exportOptions, format: 'json' })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      exportOptions.format === 'json'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 dark:border-neutral-800 hover:border-gray-300'
                    }`}
                  >
                    <FileJson size={24} className="mx-auto mb-2 text-orange-600" />
                    <div className="text-sm font-medium">JSON</div>
                    <div className="text-xs text-gray-500">.json</div>
                  </button>
                </div>
              </div>

              {/* What to Export */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  What to Export
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeCodes}
                      onChange={e =>
                        setExportOptions({ ...exportOptions, includeCodes: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Codes {categoryId && '(current category only)'}
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeCategories}
                      onChange={e =>
                        setExportOptions({ ...exportOptions, includeCategories: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Categories</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeAnswers}
                      onChange={e =>
                        setExportOptions({ ...exportOptions, includeAnswers: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Answers (max 1000)
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeCodedAnswers}
                      onChange={e =>
                        setExportOptions({
                          ...exportOptions,
                          includeCodedAnswers: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Coded Answers (assignments)
                    </span>
                  </label>
                </div>
              </div>

              {/* Export Button */}
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Export Data
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Import Strategy */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Import Strategy
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setImportStrategy('merge')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      importStrategy === 'merge'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 dark:border-neutral-800 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium mb-1">Merge</div>
                    <div className="text-xs text-gray-500">Add new, keep existing</div>
                  </button>

                  <button
                    onClick={() => setImportStrategy('replace')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      importStrategy === 'replace'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 dark:border-neutral-800 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium mb-1">Replace</div>
                    <div className="text-xs text-gray-500">Delete old, add new</div>
                  </button>
                </div>
              </div>

              {/* Upload Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Select File
                </label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                  <Upload size={32} className="text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Click to upload Excel, CSV, or JSON
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.json"
                    onChange={handleImport}
                    className="hidden"
                    disabled={importing}
                  />
                </label>
              </div>

              {importing && (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Importing...</p>
                </div>
              )}

              {/* Template Download */}
              <button
                onClick={downloadTemplate}
                className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800 flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Download Template
              </button>

              {/* Instructions */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  Import Requirements:
                </h4>
                <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                  <li>• Excel/CSV must have "Name" column (required)</li>
                  <li>• First row must be headers</li>
                  <li>• Duplicate names will be skipped (merge) or updated (replace)</li>
                  <li>• Download template above for correct format</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
