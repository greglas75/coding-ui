import { AlertCircle, CheckCircle2, FileSpreadsheet, Home, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ImportHistoryTable } from '../components/ImportHistoryTable';
import { MainLayout } from '../components/layout/MainLayout';
import { fetchCategories } from '../lib/fetchCategories';
import { uploadFile } from '../services/apiClient';
import type { Category } from '../types';

// ═══════════════════════════════════════════════════════════════
// 🧩 COMPONENT
// ═══════════════════════════════════════════════════════════════

export function FileDataCodingPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    count?: number;
    message?: string;
  } | null>(null);

  // File preview state
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      const result = await fetchCategories();
      if (result.success) {
        setCategories(result.data);
      }
    };
    loadCategories();
  }, []);

  const parseFilePreview = async (selectedFile: File) => {
    setPreviewError(null);
    setPreviewData([]);
    setShowPreview(false);

    try {
      toast.info('Parsing file preview...');
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();
      let rows: any[] = [];

      if (extension === 'csv') {
        const text = await selectedFile.text();
        // Use simple split parsing for preview
        const lines = text.split('\n').filter(line => line.trim());
        rows = lines.map(line => line.split(',').map(col => col.trim()));
      } else if (['xlsx', 'xls'].includes(extension || '')) {
        // 🔒 SECURITY FIX: Replaced vulnerable 'xlsx' with secure 'exceljs'
        // exceljs has no known vulnerabilities and is actively maintained
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        const buf = await selectedFile.arrayBuffer();
        await workbook.xlsx.load(buf);

        // Get first worksheet
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          throw new Error('No worksheets found in Excel file');
        }

        // Convert to array of arrays (same format as before)
        rows = [];
        worksheet.eachRow((row, _rowNumber) => {
          const rowValues: any[] = [];
          row.eachCell({ includeEmpty: true }, (cell, _colNumber) => {
            // Convert cell value to string for consistency
            rowValues.push(cell.value?.toString() || '');
          });
          rows.push(rowValues);
        });
      } else {
        throw new Error('Unsupported file type');
      }

      if (rows.length === 0) {
        setPreviewError('File appears to be empty.');
        return;
      }

      // Validate structure (must have at least ID and text)
      const invalidRows = rows.filter((r: any[]) => !r[0] || !r[1]);
      if (invalidRows.length > 0) {
        setPreviewError(`Found ${invalidRows.length} row(s) missing required ID or text columns.`);
      }

      setPreviewData(rows.slice(0, 10)); // Show first 10 rows
      setShowPreview(true);
      toast.success('Preview loaded successfully');
    } catch (err: any) {
      console.error('Preview parsing error:', err);
      setPreviewError(`Parsing error: ${err.message}`);
      toast.error('Failed to parse file preview');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['.csv', '.xlsx', '.xls'];
      const fileExt = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));

      if (!validTypes.includes(fileExt)) {
        toast.error('Invalid file type. Please upload .csv or .xlsx file.');
        return;
      }

      setFile(selectedFile);
      setUploadResult(null);

      // Automatically parse preview
      parseFilePreview(selectedFile);
    }
  };

  const clearPreview = () => {
    setFile(null);
    setPreviewData([]);
    setPreviewError(null);
    setShowPreview(false);
    setUploadResult(null);

    // Reset file input
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }

    setLoading(true);
    setUploadResult(null);

    try {
      toast.info('Uploading file...');

      // Upload using apiClient
      const result = await uploadFile(file, selectedCategory);

      if (result.status === 'error') {
        throw new Error(result.error || 'Upload failed');
      }

      // Success
      setUploadResult({
        success: true,
        count: result.imported,
        message: `Successfully imported ${result.imported} records${
          result.skipped > 0 ? ` (${result.skipped} skipped)` : ''
        }`
      });

      toast.success(
        `✅ Uploaded ${result.imported} records${
          result.skipped > 0 ? ` (${result.skipped} invalid rows skipped)` : ''
        }`
      );

      // Show errors if any (limited to first few)
      if (result.errors && result.errors.length > 0) {
        console.warn('Upload errors:', result.errors);
        toast.warning(`⚠️ ${result.totalErrors || result.errors.length} rows had issues`);
      }

      // Reset form and preview
      setFile(null);
      setPreviewData([]);
      setShowPreview(false);
      setPreviewError(null);
      (document.getElementById('file-input') as HTMLInputElement).value = '';
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadResult({
        success: false,
        message: error.message || 'Upload failed'
      });
      toast.error(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout
      title="File Data Coding"
      breadcrumbs={[
        { label: 'Home', href: '/', icon: <Home size={14} /> },
        { label: 'File Data Coding' }
      ]}
      maxWidth="default"
    >
      <div className="max-w-3xl mx-auto">
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                Bulk Import Answers from File
              </h3>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Upload CSV or Excel files with answer data for automatic coding. Files should contain: id, text, language (optional), country (optional).
              </p>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm p-6">
          <div className="space-y-5">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-gray-100"
              >
                <option value="">Select a category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                All imported answers will be assigned to this category
              </p>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload File <span className="text-red-500">*</span>
              </label>
              <input
                id="file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="w-full text-sm text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 bg-gray-50 dark:bg-neutral-800 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/20 dark:file:text-blue-400"
              />
              {file && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {/* File Preview Section */}
            {showPreview && previewData.length > 0 && (
              <div className="border border-gray-200 dark:border-neutral-700 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between bg-gray-50 dark:bg-neutral-800 px-4 py-3 border-b border-gray-200 dark:border-neutral-700">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      File Preview (first 10 rows)
                    </h3>
                  </div>
                  <button
                    onClick={clearPreview}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium transition-colors"
                  >
                    Clear Preview
                  </button>
                </div>

                {previewError && (
                  <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
                    <p className="text-xs text-yellow-800 dark:text-yellow-400 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {previewError}
                    </p>
                  </div>
                )}

                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-100 dark:bg-neutral-900 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 border-b border-gray-200 dark:border-neutral-700 font-medium text-gray-700 dark:text-gray-300">
                          ID
                        </th>
                        <th className="text-left px-3 py-2 border-b border-gray-200 dark:border-neutral-700 font-medium text-gray-700 dark:text-gray-300">
                          Text
                        </th>
                        <th className="text-left px-3 py-2 border-b border-gray-200 dark:border-neutral-700 font-medium text-gray-700 dark:text-gray-300">
                          Language
                        </th>
                        <th className="text-left px-3 py-2 border-b border-gray-200 dark:border-neutral-700 font-medium text-gray-700 dark:text-gray-300">
                          Country
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                        >
                          <td className="px-3 py-2 border-b border-gray-100 dark:border-neutral-800 text-gray-900 dark:text-gray-100">
                            {row[0] || '—'}
                          </td>
                          <td className="px-3 py-2 border-b border-gray-100 dark:border-neutral-800 text-gray-900 dark:text-gray-100 max-w-md truncate">
                            {row[1] || '—'}
                          </td>
                          <td className="px-3 py-2 border-b border-gray-100 dark:border-neutral-800 text-gray-600 dark:text-gray-400">
                            {row[2] || '—'}
                          </td>
                          <td className="px-3 py-2 border-b border-gray-100 dark:border-neutral-800 text-gray-600 dark:text-gray-400">
                            {row[3] || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-2 bg-gray-50 dark:bg-neutral-800 border-t border-gray-200 dark:border-neutral-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Showing {previewData.length} of {previewData.length} rows loaded for preview
                  </p>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={loading || !file || !selectedCategory}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Send to Coding
                </>
              )}
            </button>
          </div>

          {/* Upload Result */}
          {uploadResult && (
            <div className={`mt-4 p-4 rounded-lg border ${
              uploadResult.success
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-2">
                {uploadResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`text-sm font-medium ${
                    uploadResult.success
                      ? 'text-green-800 dark:text-green-300'
                      : 'text-red-800 dark:text-red-300'
                  }`}>
                    {uploadResult.success ? 'Upload Successful' : 'Upload Failed'}
                  </p>
                  <p className={`text-xs mt-1 ${
                    uploadResult.success
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}>
                    {uploadResult.message}
                    {uploadResult.count && ` (${uploadResult.count} records)`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Documentation */}
        <div className="mt-6 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <FileSpreadsheet size={20} />
            File Structure Requirements
          </h2>

          <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="font-medium mb-2">📋 CSV/Excel Columns:</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Column 1 (id):</strong> Unique identifier - <span className="text-red-600">Required</span></li>
                <li><strong>Column 2 (text):</strong> Answer text to be coded - <span className="text-red-600">Required</span></li>
                <li><strong>Column 3 (language):</strong> Language code (e.g., "en", "pl") - <span className="text-gray-500">Optional</span></li>
                <li><strong>Column 4 (country):</strong> Country name (e.g., "Poland", "USA") - <span className="text-gray-500">Optional</span></li>
              </ul>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-md border border-gray-200 dark:border-neutral-700">
              <p className="font-medium mb-2">📄 Example CSV content:</p>
              <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 overflow-x-auto">
1,Nike shoes are great,en,Poland
2,Adidas running gear,en,USA
3,Gucci bag expensive,,Vietnam
4,Dior perfume smells good,en
5,Chanel makeup quality,en,France</pre>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                    Important Notes:
                  </p>
                  <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
                    <li>• <strong>No header row</strong> - Start directly with data</li>
                    <li>• <strong>Comma-separated</strong> - Use commas as delimiters</li>
                    <li>• <strong>Leave empty for optional</strong> - Use empty string or skip trailing commas</li>
                    <li>• <strong>Unique IDs</strong> - Ensure each row has a unique identifier</li>
                    <li>• <strong>Max file size:</strong> 10MB recommended</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">🔄 What Happens After Upload:</h3>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>File is parsed and validated</li>
                <li>Records are imported to the answers table</li>
                <li>Status is set to "uncategorized"</li>
                <li>Category ID is assigned</li>
                <li>You can start coding in the Coding view</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {categories.length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-neutral-700 p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Categories</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{categories.length}</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-neutral-700 p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Supported Formats</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">CSV, XLSX</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-neutral-700 p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Max Columns</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">4</div>
            </div>
          </div>
        )}

        {/* Import History */}
        <ImportHistoryTable />
      </div>
    </MainLayout>
  );
}
