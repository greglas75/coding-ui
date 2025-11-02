/**
 * Pinecone Settings Component
 * Configure Pinecone API for vector embeddings (brand similarity + codeframe clustering)
 */

import { AlertCircle, CheckCircle, Cloud, Database, Info, Key } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getPineconeAPIKey, setPineconeAPIKey } from '../utils/apiKeys';
import { useSettingsSync } from '../hooks/useSettingsSync';

export function PineconeSettings() {
  const [apiKey, setApiKey] = useState('');
  const [environment, setEnvironment] = useState('us-east-1');
  const [indexName, setIndexName] = useState('tgm-brand-embeddings');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const { pushSettings } = useSettingsSync();

  useEffect(() => {
    const savedApiKey = getPineconeAPIKey() || '';
    const savedEnvironment = localStorage.getItem('pinecone_environment') || 'us-east-1';
    const savedIndexName = localStorage.getItem('pinecone_index_name') || 'tgm-brand-embeddings';

    setApiKey(savedApiKey);
    setEnvironment(savedEnvironment);
    setIndexName(savedIndexName);
    setIsValid(savedApiKey.length > 0 && savedEnvironment.length > 0);
  }, []);

  const handleSave = async () => {
    setPineconeAPIKey(apiKey);
    localStorage.setItem('pinecone_environment', environment);
    localStorage.setItem('pinecone_index_name', indexName);

    // Sync to server
    try {
      await pushSettings();
      toast.success('Pinecone settings saved and synced!');
    } catch (error) {
      toast.success('Pinecone settings saved locally');
    }

    setIsValid(apiKey.length > 0 && environment.length > 0);
  };

  const handleReset = () => {
    if (confirm('Reset Pinecone settings?')) {
      setApiKey('');
      setEnvironment('us-east-1');
      setIndexName('tgm-brand-embeddings');
      setPineconeAPIKey('');
      localStorage.removeItem('pinecone_environment');
      localStorage.removeItem('pinecone_index_name');

      // Sync deletion to server
      pushSettings().catch(() => {});

      toast.info('Pinecone settings reset');
      setIsValid(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey || !environment) {
      toast.error('Please enter API key and environment');
      return;
    }

    // Show loading toast
    const loadingToast = toast.loading('Testing Pinecone connection...');

    try {
      const response = await fetch('http://localhost:8000/api/test-pinecone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pinecone_api_key: apiKey,
          index_name: indexName,
        }),
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success(data.message, {
          duration: 5000,
        });

        // Log additional details to console for debugging
        if (data.details) {
          console.log('Pinecone connection details:', data.details);
        }
      } else {
        toast.error(data.message || 'Connection test failed', {
          duration: 7000,
        });

        // Log error details to console
        if (data.details) {
          console.error('Pinecone connection error:', data.details);
        }
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Failed to test Pinecone connection:', error);
      toast.error(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        duration: 7000,
      });
    }
  };

  return (
    <div>
      {/* Status Banner */}
      <div
        className={`mb-6 p-4 rounded-lg border ${
          isValid
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
            : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
        }`}
      >
        <div className="flex items-start gap-3">
          {isValid ? (
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p
              className={`font-medium ${
                isValid
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-yellow-800 dark:text-yellow-200'
              }`}
            >
              {isValid ? 'Pinecone Configured' : 'Pinecone Not Configured'}
            </p>
            <p
              className={`text-sm mt-1 ${
                isValid
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-yellow-700 dark:text-yellow-300'
              }`}
            >
              {isValid
                ? 'Vector embeddings enabled for brand similarity and codeframe clustering.'
                : 'Configure Pinecone for brand embeddings and semantic similarity.'}
            </p>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="p-6 space-y-6">
          {/* API Key */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              <Key className="h-4 w-4" />
              Pinecone API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="pcsk_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                type="button"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Environment */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              <Cloud className="h-4 w-4" />
              Environment
            </label>
            <input
              type="text"
              value={environment}
              onChange={e => setEnvironment(e.target.value)}
              placeholder="us-east1-gcp"
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Index Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              <Database className="h-4 w-4" />
              Index Name
            </label>
            <input
              type="text"
              value={indexName}
              onChange={e => setIndexName(e.target.value)}
              placeholder="tgm-brand-embeddings"
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Help Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Pinecone Usage
            </h3>
            <div className="text-xs text-blue-800 dark:text-blue-200 space-y-2">
              <p>
                <strong>Brand Embeddings:</strong> Stores brand vectors in <code>tgm-brand-embeddings</code> index for semantic similarity search
              </p>
              <p>
                <strong>Codeframe Clustering:</strong> Used for answer embeddings in open-ended analysis
              </p>
              <p className="mt-3">
                Get your API key from{' '}
                <a
                  href="https://app.pinecone.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-600 dark:hover:text-blue-300"
                >
                  Pinecone Console
                </a>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Save Settings
            </button>
            <button
              onClick={handleTestConnection}
              disabled={!apiKey || !environment}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Test Connection
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
              Vector Database
            </h3>
            <p className="text-sm text-purple-800 dark:text-purple-200">
              Pinecone stores vector embeddings for semantic similarity search. It's used for brand matching (finding similar brands) and codeframe clustering (grouping similar answers). Free tier includes 1M vectors and 100k queries/month.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
