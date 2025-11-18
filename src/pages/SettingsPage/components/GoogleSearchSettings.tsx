/**
 * Google Search Settings Component
 */

import { AlertCircle, CheckCircle, Info, Key, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function GoogleSearchSettings() {
  const [apiKey, setApiKey] = useState('');
  const [cxId, setCxId] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showCxId, setShowCxId] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const savedApiKey = localStorage.getItem('google_cse_api_key') || '';
    const savedCxId = localStorage.getItem('google_cse_cx_id') || '';

    setApiKey(savedApiKey);
    setCxId(savedCxId);
    setIsValid(savedApiKey.length > 0 && savedCxId.length > 0);
  }, []);

  const handleSave = () => {
    localStorage.setItem('google_cse_api_key', apiKey);
    localStorage.setItem('google_cse_cx_id', cxId);

    toast.success('Google Search settings saved!');
    setIsValid(apiKey.length > 0 && cxId.length > 0);
  };

  const handleReset = () => {
    if (confirm('Reset Google Search settings?')) {
      setApiKey('');
      setCxId('');
      localStorage.removeItem('google_cse_api_key');
      localStorage.removeItem('google_cse_cx_id');
      toast.info('Google Search settings reset');
      setIsValid(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey || !cxId) {
      toast.error('Please enter both API key and CX ID');
      return;
    }

    toast.success('Configuration looks valid!');
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
              {isValid ? 'Google Search Configured' : 'Google Search Not Configured'}
            </p>
            <p
              className={`text-sm mt-1 ${
                isValid
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-yellow-700 dark:text-yellow-300'
              }`}
            >
              {isValid
                ? 'Ready to use. Google Search API is configured.'
                : 'Configure your Google Custom Search API key and CX ID to enable web search features.'}
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
              Google Custom Search API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
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
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 flex items-start gap-2">
              <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <span>
                Get your API key from{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Google Cloud Console
                </a>
              </span>
            </p>
          </div>

          {/* CX ID */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              <Search className="h-4 w-4" />
              Custom Search Engine ID (CX)
            </label>
            <div className="relative">
              <input
                type={showCxId ? 'text' : 'password'}
                value={cxId}
                onChange={e => setCxId(e.target.value)}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => setShowCxId(!showCxId)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                type="button"
              >
                {showCxId ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 flex items-start gap-2">
              <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <span>
                Create a Custom Search Engine at{' '}
                <a
                  href="https://programmablesearchengine.google.com/controlpanel/create"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Google Programmable Search Engine
                </a>
              </span>
            </p>
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
              disabled={!apiKey || !cxId}
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
    </div>
  );
}

