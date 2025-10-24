import { useCostDetailed } from '@/hooks/useCostDetailed';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useState } from 'react';
import { simpleLogger } from '../../utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3020';

export function DetailedTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const [featureFilter, setFeatureFilter] = useState<
    'all' | 'answer_coding' | 'codeframe_generation'
  >('all');
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = useCostDetailed({
    page: currentPage,
    limit: 20,
    featureType: featureFilter === 'all' ? undefined : featureFilter,
  });

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const response = await axios.get(`${API_BASE_URL}/api/v1/cost-dashboard/export`, {
        params: {
          feature_type: featureFilter === 'all' ? undefined : featureFilter,
        },
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ai-costs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      simpleLogger.error('Failed to export CSV:', error);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getFeatureName = (type: string) => {
    return type === 'answer_coding' ? 'Answer Coding' : 'Codeframe Builder';
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  const { items, pagination } = data;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      {/* Header with filters and export */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Detailed Cost Breakdown
          </h3>

          <div className="flex gap-3">
            {/* Feature filter */}
            <select
              value={featureFilter}
              onChange={e => {
                setFeatureFilter(e.target.value as typeof featureFilter);
                setCurrentPage(1); // Reset to first page when filter changes
              }}
              className="px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Features</option>
              <option value="answer_coding">Answer Coding</option>
              <option value="codeframe_generation">Codeframe Builder</option>
            </select>

            {/* Export button */}
            <button
              onClick={handleExportCSV}
              disabled={isExporting || items.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No cost data available</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              Cost details will appear here as you use AI features
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Feature
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Tokens
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.map(item => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(item.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.feature_type === 'answer_coding'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      }`}
                    >
                      {getFeatureName(item.feature_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                    {item.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {item.model}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 text-right font-mono">
                    {(item.input_tokens + item.output_tokens).toLocaleString()}
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      {item.input_tokens.toLocaleString()} in /{' '}
                      {item.output_tokens.toLocaleString()} out
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                    ${item.cost_usd.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(pagination.current_page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.current_page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} results
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={pagination.current_page === 1}
                className="flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="flex items-center px-4 text-sm text-gray-700 dark:text-gray-300">
                Page {pagination.current_page} of {pagination.total_pages}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(pagination.total_pages, prev + 1))}
                disabled={pagination.current_page === pagination.total_pages}
                className="flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
