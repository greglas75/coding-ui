/**
 * ⚙️ Settings Page
 *
 * Configure OpenAI API settings and other application preferences
 */

import { AlertCircle, CheckCircle, Cpu, Home, Info, Key, Settings, Thermometer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MainLayout } from '../components/layout/MainLayout';
import { getOpenAIStatus, validateOpenAIConfig } from '../lib/openai';

export function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(0.3);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('openai_api_key') || '';
    const savedModel = localStorage.getItem('openai_model') || 'gpt-4o-mini';
    const savedTemperature = parseFloat(localStorage.getItem('openai_temperature') || '0.3');

    setApiKey(savedApiKey);
    setModel(savedModel);
    setTemperature(savedTemperature);

    // Check if API key is valid
    setIsValid(validateOpenAIConfig());
  }, []);

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('openai_api_key', apiKey);
    localStorage.setItem('openai_model', model);
    localStorage.setItem('openai_temperature', temperature.toString());

    // Show success toast
    toast.success('Settings saved!', {
      description: 'Your OpenAI configuration has been updated.',
    });

    // Update validation status
    setIsValid(apiKey.length > 0);

    console.log('✅ OpenAI settings saved:', { model, temperature });
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      setApiKey('');
      setModel('gpt-4o-mini');
      setTemperature(0.3);

      localStorage.removeItem('openai_api_key');
      localStorage.removeItem('openai_model');
      localStorage.removeItem('openai_temperature');

      toast.info('Settings reset to defaults');
      setIsValid(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey) {
      toast.error('Please enter an API key first');
      return;
    }

    toast.loading('Testing OpenAI connection...', { id: 'test-connection' });

    // Simple test: just check if API key format is valid
    if (apiKey.startsWith('sk-')) {
      setTimeout(() => {
        toast.success('API key format looks valid!', {
          id: 'test-connection',
          description: 'Try categorizing an answer to fully test the connection.',
        });
      }, 1000);
    } else {
      toast.error('Invalid API key format', {
        id: 'test-connection',
        description: 'OpenAI API keys should start with "sk-"',
      });
    }
  };

  const status = getOpenAIStatus();

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Home', href: '/', icon: <Home size={14} /> },
        { label: 'Settings', icon: <Settings size={14} /> }
      ]}
      maxWidth="default"
    >
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            AI Settings
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Configure OpenAI API key and model settings for AI-powered categorization
          </p>
        </div>

        {/* Status Banner */}
        <div className={`mb-6 p-4 rounded-lg border ${
          isValid
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
            : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
        }`}>
          <div className="flex items-start gap-3">
            {isValid ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`font-medium ${
                isValid
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-yellow-800 dark:text-yellow-200'
              }`}>
                {isValid ? 'OpenAI Configured' : 'OpenAI Not Configured'}
              </p>
              <p className={`text-sm mt-1 ${
                isValid
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-yellow-700 dark:text-yellow-300'
              }`}>
                {isValid
                  ? 'AI categorization is ready to use. Click the ✨ Sparkles button to categorize answers.'
                  : 'Please configure your OpenAI API key below to enable AI categorization features.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="p-6 space-y-6">

            {/* API Key Section */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                <Key className="h-4 w-4" />
                OpenAI API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx"
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
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    OpenAI Platform
                  </a>
                  . Your key is stored locally in your browser.
                </span>
              </p>
            </div>

            {/* Model Selection */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                <Cpu className="h-4 w-4" />
                AI Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="gpt-4o-mini">GPT-4o Mini (Fastest, Most Cost-Effective) ⭐ Recommended</option>
                <option value="gpt-4o">GPT-4o (Balanced Speed & Quality)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo (High Quality)</option>
                <option value="gpt-4">GPT-4 (Best Quality, Slowest)</option>
              </select>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                GPT-4o Mini is recommended for most use cases. It's fast and cost-effective.
              </p>
            </div>

            {/* Temperature Setting */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                <Thermometer className="h-4 w-4" />
                Temperature: <span className="font-mono">{temperature.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">0.0 (Focused)</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">1.0 (Creative)</span>
              </div>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Lower values (0.0-0.3) are recommended for categorization tasks. Higher values produce more varied results.
              </p>
            </div>

            {/* Cost Estimate */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                💰 Cost Estimate
              </h3>
              <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                <p>• GPT-4o Mini: ~$0.0001 per categorization (⭐ Recommended)</p>
                <p>• GPT-4o: ~$0.0003 per categorization</p>
                <p>• GPT-4: ~$0.001 per categorization</p>
                <p className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                  Example: 1,000 answers with GPT-4o Mini = <strong>~$0.10</strong>
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
                disabled={!apiKey}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Test Connection
              </button>

              <button
                onClick={handleReset}
                className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 transition-colors"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            📚 How to Use AI Categorization
          </h2>

          <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
            <div>
              <h3 className="font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                1. Get Your API Key
              </h3>
              <p>
                Visit{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  OpenAI Platform
                </a>
                {' '}to create a new API key. Copy the key (starts with "sk-").
              </p>
            </div>

            <div>
              <h3 className="font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                2. Configure Settings
              </h3>
              <p>
                Paste your API key above and select your preferred model.
                We recommend GPT-4o Mini for the best balance of speed and cost.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                3. Use AI Features
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Click ✨ Sparkles button to categorize individual answers</li>
                <li>Select multiple answers and use bulk AI categorization</li>
                <li>Accept AI suggestions by clicking them</li>
                <li>Dismiss unwanted suggestions with the ✕ button</li>
                <li>Regenerate suggestions with the 🔄 button</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                4. Monitor Usage
              </h3>
              <p>
                Track your API usage and costs in the{' '}
                <a
                  href="https://platform.openai.com/usage"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  OpenAI Dashboard
                </a>
                . Set up billing alerts to stay within budget.
              </p>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                Security Notice
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Your API key is stored locally in your browser's localStorage.
                For production use, we recommend moving the OpenAI integration to a server-side API
                to protect your API key. Never share your API key publicly.
              </p>
            </div>
          </div>
        </div>

        {/* Debug Info (Development Only) */}
        {import.meta.env.DEV && (
          <div className="mt-6 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 font-mono text-xs">
            <h3 className="font-semibold mb-2 text-zinc-900 dark:text-zinc-100">
              🔧 Debug Info
            </h3>
            <div className="space-y-1 text-zinc-600 dark:text-zinc-400">
              <p>API Key Present: {status.apiKeyPresent ? '✅' : '❌'}</p>
              <p>Configured: {status.configured ? '✅' : '❌'}</p>
              <p>Model: {model}</p>
              <p>Temperature: {temperature}</p>
              <p>Environment: {import.meta.env.MODE}</p>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
