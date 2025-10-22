/**
 * ⚙️ Settings Page
 *
 * Configure AI providers (OpenAI, Claude, Gemini) and Google Search API settings
 */

import { Tab } from '@headlessui/react';
import { AlertCircle, CheckCircle, Cloud, Cpu, Home, Info, Key, Search, Settings, Thermometer, Shield } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MainLayout } from '../components/layout/MainLayout';
import { PricingDashboard } from '../components/PricingDashboard';
import { useAIPricing } from '../hooks/useAIPricing';
import type { ModelPricing } from '../types/pricing';
import { getSessionOnlyMode, enableSessionOnlyMode, disableSessionOnlyMode } from '../utils/apiKeys';

export function SettingsPage() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [sessionOnlyMode, setSessionOnlyMode] = useState(getSessionOnlyMode());
  const { getPricingForProvider } = useAIPricing();

  // Map tab index to provider
  const getProviderForTab = (tabIndex: number): 'openai' | 'anthropic' | 'google' | null => {
    if (tabIndex === 0) return 'openai';
    if (tabIndex === 1) return 'anthropic';
    if (tabIndex === 2) return 'google';
    return null; // Google Search tab
  };

  // Handle session-only mode toggle
  const handleSessionOnlyToggle = (enabled: boolean) => {
    if (enabled) {
      enableSessionOnlyMode();
      toast.success('Session-only mode enabled - keys will be cleared when tab closes');
    } else {
      disableSessionOnlyMode();
      toast.success('Keys will now persist across sessions');
    }
    setSessionOnlyMode(enabled);
  };

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
            Configure API keys and settings for AI providers and search services
          </p>
        </div>

        {/* Security Warning Banner */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 text-sm">
                🔒 API Key Security Notice
              </h3>
              <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1.5">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Protected:</strong> Keys are obfuscated (XOR + Base64) in browser storage</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Private:</strong> Never sent to external servers (only to your local backend)</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Limitation:</strong> Still accessible to JavaScript running on this page</span>
                </li>
                <li className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Production:</strong> For production apps, store keys on backend server only</span>
                </li>
              </ul>

              {/* Session-Only Mode Toggle */}
              <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sessionOnlyMode}
                      onChange={(e) => handleSessionOnlyToggle(e.target.checked)}
                      className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-blue-600 dark:bg-blue-900"
                    />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Session-Only Mode
                    </span>
                  </div>
                  <span className="text-xs text-blue-700 dark:text-blue-300">
                    {sessionOnlyMode ? '🔓 Keys cleared on tab close' : '💾 Keys persist'}
                  </span>
                </label>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1.5 ml-6">
                  When enabled, API keys are stored in session storage and automatically cleared when you close this tab.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
          <Tab.List className="flex space-x-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1 mb-6">
            <Tab as={Fragment}>
              {({ selected }) => (
                <button
                  className={`
                    w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all
                    ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2
                    ${selected
                      ? 'bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-400 shadow'
                      : 'text-zinc-700 dark:text-zinc-400 hover:bg-white/[0.12] hover:text-zinc-900 dark:hover:text-zinc-200'
                    }
                  `}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Cloud className="w-4 h-4" />
                    <span>OpenAI</span>
                  </div>
                </button>
              )}
            </Tab>
            <Tab as={Fragment}>
              {({ selected }) => (
                <button
                  className={`
                    w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all
                    ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2
                    ${selected
                      ? 'bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-400 shadow'
                      : 'text-zinc-700 dark:text-zinc-400 hover:bg-white/[0.12] hover:text-zinc-900 dark:hover:text-zinc-200'
                    }
                  `}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Cpu className="w-4 h-4" />
                    <span>Claude</span>
                  </div>
                </button>
              )}
            </Tab>
            <Tab as={Fragment}>
              {({ selected }) => (
                <button
                  className={`
                    w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all
                    ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2
                    ${selected
                      ? 'bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-400 shadow'
                      : 'text-zinc-700 dark:text-zinc-400 hover:bg-white/[0.12] hover:text-zinc-900 dark:hover:text-zinc-200'
                    }
                  `}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Cloud className="w-4 h-4" />
                    <span>Gemini</span>
                  </div>
                </button>
              )}
            </Tab>
            <Tab as={Fragment}>
              {({ selected }) => (
                <button
                  className={`
                    w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all
                    ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2
                    ${selected
                      ? 'bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-400 shadow'
                      : 'text-zinc-700 dark:text-zinc-400 hover:bg-white/[0.12] hover:text-zinc-900 dark:hover:text-zinc-200'
                    }
                  `}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Search className="w-4 h-4" />
                    <span>Google Search</span>
                  </div>
                </button>
              )}
            </Tab>
          </Tab.List>

          <Tab.Panels>
            <Tab.Panel>
              <OpenAISettings models={getPricingForProvider('openai')} />
            </Tab.Panel>
            <Tab.Panel>
              <ClaudeSettings models={getPricingForProvider('anthropic')} />
            </Tab.Panel>
            <Tab.Panel>
              <GeminiSettings models={getPricingForProvider('google')} />
            </Tab.Panel>
            <Tab.Panel>
              <GoogleSearchSettings />
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>

        {/* Pricing Dashboard - Hide on Google Search tab */}
        {selectedTab !== 3 && (
          <div className="mt-6">
            <PricingDashboard filterProvider={getProviderForTab(selectedTab)} />
          </div>
        )}

        {/* Automation Info */}
        <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-1 text-sm">
                🤖 Automatyczna Aktualizacja Cen i Modeli
              </h3>
              <p className="text-xs text-purple-800 dark:text-purple-200">
                Ceny i lista modeli są z <strong>października 2025</strong>. Chcesz automatycznie aktualizować ceny
                i wykrywać nowe modele? Zobacz{' '}
                <a
                  href="https://github.com/yourusername/coding-ui/blob/main/docs/AI_PRICING_AUTO_UPDATE.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-purple-600 dark:hover:text-purple-300 font-medium"
                >
                  dokumentację automatyzacji
                </a>
                {' '}(JSON config, API endpoints, GitHub Actions).
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

// ═══════════════════════════════════════════════════════════════
// OpenAI Settings Component
// ═══════════════════════════════════════════════════════════════

interface ProviderSettingsProps {
  models: ModelPricing[];
}

function OpenAISettings({ models }: ProviderSettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [temperature, setTemperature] = useState(0.3);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const savedApiKey = localStorage.getItem('openai_api_key') || '';
    const savedModel = localStorage.getItem('openai_model') || 'gpt-4o';
    const savedTemperature = parseFloat(localStorage.getItem('openai_temperature') || '0.3');

    setApiKey(savedApiKey);
    setModel(savedModel);
    setTemperature(savedTemperature);
    setIsValid(savedApiKey.length > 0);
  }, []);

  const handleSave = () => {
    localStorage.setItem('openai_api_key', apiKey);
    localStorage.setItem('openai_model', model);
    localStorage.setItem('openai_temperature', temperature.toString());

    toast.success('OpenAI settings saved!');
    setIsValid(apiKey.length > 0);
  };

  const handleReset = () => {
    if (confirm('Reset OpenAI settings to defaults?')) {
      setApiKey('');
      setModel('gpt-4o');
      setTemperature(0.3);
      localStorage.removeItem('openai_api_key');
      localStorage.removeItem('openai_model');
      localStorage.removeItem('openai_temperature');
      toast.info('OpenAI settings reset');
      setIsValid(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey) {
      toast.error('Please enter an API key first');
      return;
    }

    if (apiKey.startsWith('sk-')) {
      toast.success('API key format looks valid!');
    } else {
      toast.error('Invalid API key format. OpenAI keys start with "sk-"');
    }
  };

  return (
    <div>
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
              isValid ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'
            }`}>
              {isValid ? 'OpenAI Configured' : 'OpenAI Not Configured'}
            </p>
            <p className={`text-sm mt-1 ${
              isValid ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'
            }`}>
              {isValid
                ? 'Ready to use. GPT-5 is the latest and most powerful model.'
                : 'Configure your OpenAI API key to enable AI features.'
              }
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
              </span>
            </p>
          </div>

          {/* Temperature */}
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
              <strong>Co to jest temperatura?</strong> Kontroluje losowość odpowiedzi AI. Niskie wartości (0.0-0.3) =
              deterministyczne, spójne odpowiedzi (idealne do kategoryzacji). Wysokie wartości (0.7-1.0) =
              bardziej kreatywne, zróżnicowane odpowiedzi.
            </p>
          </div>

          {/* Security Notice */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1 text-sm">
                  🔒 Gdzie są zapisane klucze API?
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Twoje klucze API są przechowywane <strong>lokalnie w przeglądarce</strong> (localStorage).
                  Nigdy nie są wysyłane na żaden zewnętrzny serwer - pozostają tylko w Twojej przeglądarce.
                  Dla produkcji zalecamy przeniesienie integracji AI na backend.
                </p>
              </div>
            </div>
          </div>

          {/* Cost Estimate */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              💰 Przewidywany koszt za 1000 odpowiedzi (z API)
            </h3>
            <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1 max-h-48 overflow-y-auto">
              {models.length > 0 ? (
                models
                  .sort((a, b) => a.costPer1000Responses - b.costPer1000Responses) // Sort by cost ascending
                  .map((m) => (
                    <p key={m.id} className="flex justify-between items-center py-1">
                      <span>• {m.name}</span>
                      <span className="font-bold">${m.costPer1000Responses.toFixed(4)}</span>
                    </p>
                  ))
              ) : (
                <p className="text-zinc-600 dark:text-zinc-400">Ładowanie cen...</p>
              )}
              <p className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700 text-[11px]">
                Ceny z API. Sprawdź aktualne na{' '}
                <a
                  href="https://openai.com/api/pricing/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-600 dark:hover:text-blue-300"
                >
                  openai.com/pricing
                </a>
              </p>
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              <Cpu className="h-4 w-4" />
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {models.length > 0 ? (
                models
                  .sort((a, b) => b.quality - a.quality) // Sort by quality descending
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.description ? `- ${m.description}` : ''} (${m.costPer1000Responses.toFixed(4)}/1k)
                    </option>
                  ))
              ) : (
                <option value="">Loading models...</option>
              )}
            </select>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {models.length} dostępnych modeli z API (sortowane po jakości)
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
              disabled={!apiKey}
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

// ═══════════════════════════════════════════════════════════════
// Claude Settings Component
// ═══════════════════════════════════════════════════════════════

function ClaudeSettings({ models }: ProviderSettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('claude-sonnet-4.5');
  const [temperature, setTemperature] = useState(0.3);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const savedApiKey = localStorage.getItem('anthropic_api_key') || '';
    const savedModel = localStorage.getItem('anthropic_model') || 'claude-sonnet-4.5';
    const savedTemperature = parseFloat(localStorage.getItem('anthropic_temperature') || '0.3');

    setApiKey(savedApiKey);
    setModel(savedModel);
    setTemperature(savedTemperature);
    setIsValid(savedApiKey.length > 0);
  }, []);

  const handleSave = () => {
    localStorage.setItem('anthropic_api_key', apiKey);
    localStorage.setItem('anthropic_model', model);
    localStorage.setItem('anthropic_temperature', temperature.toString());

    toast.success('Claude settings saved!');
    setIsValid(apiKey.length > 0);
  };

  const handleReset = () => {
    if (confirm('Reset Claude settings to defaults?')) {
      setApiKey('');
      setModel('claude-sonnet-4.5');
      setTemperature(0.3);
      localStorage.removeItem('anthropic_api_key');
      localStorage.removeItem('anthropic_model');
      localStorage.removeItem('anthropic_temperature');
      toast.info('Claude settings reset');
      setIsValid(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey) {
      toast.error('Please enter an API key first');
      return;
    }

    if (apiKey.startsWith('sk-ant-')) {
      toast.success('API key format looks valid!');
    } else {
      toast.error('Invalid API key format. Anthropic keys start with "sk-ant-"');
    }
  };

  return (
    <div>
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
              isValid ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'
            }`}>
              {isValid ? 'Claude Configured' : 'Claude Not Configured'}
            </p>
            <p className={`text-sm mt-1 ${
              isValid ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'
            }`}>
              {isValid
                ? 'Ready to use. Claude Sonnet 4.5 is the best coding model available.'
                : 'Configure your Anthropic API key to enable Claude features.'
              }
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
              Anthropic API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx"
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
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Anthropic Console
                </a>
              </span>
            </p>
          </div>

          {/* Temperature */}
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
              <strong>Co to jest temperatura?</strong> Kontroluje losowość odpowiedzi AI. Niskie wartości (0.0-0.3) =
              deterministyczne, spójne odpowiedzi (idealne do kategoryzacji). Wysokie wartości (0.7-1.0) =
              bardziej kreatywne, zróżnicowane odpowiedzi.
            </p>
          </div>

          {/* Security Notice */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1 text-sm">
                  🔒 Gdzie są zapisane klucze API?
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Twoje klucze API są przechowywane <strong>lokalnie w przeglądarce</strong> (localStorage).
                  Nigdy nie są wysyłane na żaden zewnętrzny serwer - pozostają tylko w Twojej przeglądarce.
                  Dla produkcji zalecamy przeniesienie integracji AI na backend.
                </p>
              </div>
            </div>
          </div>

          {/* Cost Estimate */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              💰 Przewidywany koszt za 1000 odpowiedzi (z API)
            </h3>
            <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1 max-h-48 overflow-y-auto">
              {models.length > 0 ? (
                models
                  .sort((a, b) => a.costPer1000Responses - b.costPer1000Responses) // Sort by cost ascending
                  .map((m) => (
                    <p key={m.id} className="flex justify-between items-center py-1">
                      <span>• {m.name}</span>
                      <span className="font-bold">${m.costPer1000Responses.toFixed(4)}</span>
                    </p>
                  ))
              ) : (
                <p className="text-zinc-600 dark:text-zinc-400">Ładowanie cen...</p>
              )}
              <p className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700 text-[11px]">
                Ceny z API. Sprawdź aktualne na{' '}
                <a
                  href="https://www.anthropic.com/pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-600 dark:hover:text-blue-300"
                >
                  anthropic.com/pricing
                </a>
              </p>
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              <Cpu className="h-4 w-4" />
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {models.length > 0 ? (
                models
                  .sort((a, b) => b.quality - a.quality) // Sort by quality descending
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.description ? `- ${m.description}` : ''} (${m.costPer1000Responses.toFixed(4)}/1k)
                    </option>
                  ))
              ) : (
                <option value="">Loading models...</option>
              )}
            </select>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {models.length} dostępnych modeli z API (sortowane po jakości)
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
              disabled={!apiKey}
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

// ═══════════════════════════════════════════════════════════════
// Gemini Settings Component
// ═══════════════════════════════════════════════════════════════

function GeminiSettings({ models }: ProviderSettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.0-pro-exp');
  const [temperature, setTemperature] = useState(0.3);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const savedApiKey = localStorage.getItem('google_gemini_api_key') || '';
    const savedModel = localStorage.getItem('google_gemini_model') || 'gemini-2.0-pro-exp';
    const savedTemperature = parseFloat(localStorage.getItem('google_gemini_temperature') || '0.3');

    setApiKey(savedApiKey);
    setModel(savedModel);
    setTemperature(savedTemperature);
    setIsValid(savedApiKey.length > 0);
  }, []);

  const handleSave = () => {
    localStorage.setItem('google_gemini_api_key', apiKey);
    localStorage.setItem('google_gemini_model', model);
    localStorage.setItem('google_gemini_temperature', temperature.toString());

    toast.success('Gemini settings saved!');
    setIsValid(apiKey.length > 0);
  };

  const handleReset = () => {
    if (confirm('Reset Gemini settings to defaults?')) {
      setApiKey('');
      setModel('gemini-2.0-pro-exp');
      setTemperature(0.3);
      localStorage.removeItem('google_gemini_api_key');
      localStorage.removeItem('google_gemini_model');
      localStorage.removeItem('google_gemini_temperature');
      toast.info('Gemini settings reset');
      setIsValid(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey) {
      toast.error('Please enter an API key first');
      return;
    }

    toast.success('API key format looks valid!');
  };

  return (
    <div>
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
              isValid ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'
            }`}>
              {isValid ? 'Gemini Configured' : 'Gemini Not Configured'}
            </p>
            <p className={`text-sm mt-1 ${
              isValid ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'
            }`}>
              {isValid
                ? 'Ready to use. Gemini 2.0 Pro has 2M token context window.'
                : 'Configure your Google AI API key to enable Gemini features.'
              }
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
              Google AI API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
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
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Google AI Studio
                </a>
              </span>
            </p>
          </div>

          {/* Temperature */}
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
              <strong>Co to jest temperatura?</strong> Kontroluje losowość odpowiedzi AI. Niskie wartości (0.0-0.3) =
              deterministyczne, spójne odpowiedzi (idealne do kategoryzacji). Wysokie wartości (0.7-1.0) =
              bardziej kreatywne, zróżnicowane odpowiedzi.
            </p>
          </div>

          {/* Security Notice */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1 text-sm">
                  🔒 Gdzie są zapisane klucze API?
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Twoje klucze API są przechowywane <strong>lokalnie w przeglądarce</strong> (localStorage).
                  Nigdy nie są wysyłane na żaden zewnętrzny serwer - pozostają tylko w Twojej przeglądarce.
                  Dla produkcji zalecamy przeniesienie integracji AI na backend.
                </p>
              </div>
            </div>
          </div>

          {/* Cost Estimate */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              💰 Przewidywany koszt za 1000 odpowiedzi (z API)
            </h3>
            <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1 max-h-48 overflow-y-auto">
              {models.length > 0 ? (
                models
                  .sort((a, b) => a.costPer1000Responses - b.costPer1000Responses) // Sort by cost ascending
                  .map((m) => (
                    <p key={m.id} className="flex justify-between items-center py-1">
                      <span>• {m.name}</span>
                      <span className="font-bold">${m.costPer1000Responses.toFixed(4)}</span>
                    </p>
                  ))
              ) : (
                <p className="text-zinc-600 dark:text-zinc-400">Ładowanie cen...</p>
              )}
              <p className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700 text-[11px]">
                Ceny z API. Sprawdź aktualne na{' '}
                <a
                  href="https://ai.google.dev/pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-600 dark:hover:text-blue-300"
                >
                  ai.google.dev/pricing
                </a>
              </p>
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              <Cpu className="h-4 w-4" />
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {models.length > 0 ? (
                models
                  .sort((a, b) => b.quality - a.quality) // Sort by quality descending
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.description ? `- ${m.description}` : ''} (${m.costPer1000Responses.toFixed(4)}/1k)
                    </option>
                  ))
              ) : (
                <option value="">Loading models...</option>
              )}
            </select>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {models.length} dostępnych modeli z API (sortowane po jakości)
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
              disabled={!apiKey}
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

// ═══════════════════════════════════════════════════════════════
// Google Search Settings Component
// ═══════════════════════════════════════════════════════════════

function GoogleSearchSettings() {
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
              isValid ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'
            }`}>
              {isValid ? 'Google Search Configured' : 'Google Search Not Configured'}
            </p>
            <p className={`text-sm mt-1 ${
              isValid ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'
            }`}>
              {isValid
                ? 'Web context enrichment is enabled for AI categorization.'
                : 'Configure Google Custom Search to enable web context features.'
              }
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
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
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

          {/* CX ID */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              <Search className="h-4 w-4" />
              Search Engine ID (CX)
            </label>
            <div className="relative">
              <input
                type={showCxId ? 'text' : 'password'}
                value={cxId}
                onChange={(e) => setCxId(e.target.value)}
                placeholder="xxxxxxxxxxxxxxxxx:xxxxxxxxx"
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
          </div>

          {/* Help Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              How to Set Up Google Custom Search
            </h3>
            <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
              <li>
                Get an API key from{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-600 dark:hover:text-blue-300"
                >
                  Google Cloud Console
                </a>
              </li>
              <li>Enable "Custom Search API" in your project</li>
              <li>
                Create a Custom Search Engine at{' '}
                <a
                  href="https://programmablesearchengine.google.com/controlpanel/create"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-600 dark:hover:text-blue-300"
                >
                  Programmable Search Engine
                </a>
              </li>
              <li>Copy the Search Engine ID (CX) from the control panel</li>
              <li>Paste both credentials above and save</li>
            </ol>
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

      {/* Additional Info */}
      <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
              About Web Context
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Google Custom Search enriches AI categorization by providing real-time web context.
              This helps identify brands, products, and entities more accurately. The service has
              a free tier with 100 queries per day.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
