import { AlertCircle, CheckCircle, Clock, FileText, RefreshCw, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { simpleLogger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════
// 🎯 TYPES
// ═══════════════════════════════════════════════════════════════

interface FileImport {
  id: string;
  file_name: string;
  category_name: string | null;
  category_id: number | null;
  rows_imported: number;
  rows_skipped: number;
  user_email: string;
  status: 'success' | 'failed' | 'partial';
  error_message: string | null;
  file_size_kb: number | null;
  processing_time_ms: number | null;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// 🧩 COMPONENT
// ═══════════════════════════════════════════════════════════════

export function ImportHistoryTable() {
  const [imports, setImports] = useState<FileImport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchImports = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch recent imports with category name
      const { data, error: fetchError } = await supabase
        .from('file_imports')
        .select(`
          *,
          categories (
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchError) {
        throw fetchError;
      }

      // Map data to include category name
      const mappedData = (data || []).map((item: any) => ({
        ...item,
        category_name: item.categories?.name || item.category_name || 'Unknown'
      }));

      setImports(mappedData);
    } catch (err: any) {
      simpleLogger.error('Failed to fetch import history:', err);
      setError(err.message || 'Failed to load history');
      toast.error('Failed to load import history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImports();
  }, []);

  const handleReimport = async (importRecord: FileImport) => {
    toast.info('Re-import feature coming soon!');
    simpleLogger.info('Re-import requested for:', importRecord);
    // TODO: Implement re-import functionality
    // This would require storing the original file or file path
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={16} className="text-green-600 dark:text-green-400" />;
      case 'failed':
        return <XCircle size={16} className="text-red-600 dark:text-red-400" />;
      case 'partial':
        return <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400" />;
      default:
        return null;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (sizeKb: number | null) => {
    if (!sizeKb) return '-';
    if (sizeKb < 1024) return `${sizeKb.toFixed(1)} KB`;
    return `${(sizeKb / 1024).toFixed(2)} MB`;
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-neutral-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Import History
          </h2>
        </div>
        <button
          onClick={fetchImports}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-md transition-colors disabled:opacity-50"
          title="Refresh history"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-700 dark:text-red-400">
            ❌ {error}
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && imports.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-sm">Loading history...</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && imports.length === 0 && !error && (
        <div className="py-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No import history yet. Upload your first file to see it here.
          </p>
        </div>
      )}

      {/* Table */}
      {imports.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
            <thead className="bg-gray-50 dark:bg-neutral-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  File
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Rows
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                  Size
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-700">
              {imports.map((importRecord) => (
                <tr
                  key={importRecord.id}
                  className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  {/* File Name */}
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-gray-400 dark:text-gray-600 flex-shrink-0" />
                      <span className="text-gray-900 dark:text-gray-100 truncate max-w-[200px]" title={importRecord.file_name}>
                        {importRecord.file_name}
                      </span>
                    </div>
                    {importRecord.error_message && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 truncate max-w-[200px]" title={importRecord.error_message}>
                        {importRecord.error_message}
                      </p>
                    )}
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {importRecord.category_name}
                  </td>

                  {/* Rows */}
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-col">
                      <span className="text-gray-900 dark:text-gray-100 font-medium">
                        {importRecord.rows_imported.toLocaleString()}
                      </span>
                      {importRecord.rows_skipped > 0 && (
                        <span className="text-xs text-yellow-600 dark:text-yellow-400">
                          {importRecord.rows_skipped} skipped
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Size (hidden on mobile) */}
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
                    {formatFileSize(importRecord.file_size_kb)}
                  </td>

                  {/* Duration (hidden on tablet) */}
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-gray-400" />
                      {formatDuration(importRecord.processing_time_ms)}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                        importRecord.status
                      )}`}
                    >
                      {getStatusIcon(importRecord.status)}
                      {importRecord.status}
                    </span>
                  </td>

                  {/* Date (hidden on mobile) */}
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    {formatDate(importRecord.created_at)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-sm text-right">
                    <button
                      onClick={() => handleReimport(importRecord)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-medium transition-colors"
                      title="Re-import this file (coming soon)"
                    >
                      Re-import
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Info */}
      {imports.length > 0 && (
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Showing last {imports.length} import{imports.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
