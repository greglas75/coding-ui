/**
 * Provider Settings Form Component
 * Reusable form for AI provider settings (OpenAI, Claude, Gemini)
 */

import {
  AlertCircle,
  CheckCircle,
  Cpu,
  Info,
  Key,
  Thermometer,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ModelPricing } from '../../../types/pricing';
import { useProviderSettings } from '../hooks/useProviderSettings';

interface ProviderSettingsFormProps {
  provider: 'openai' | 'anthropic' | 'google_gemini';
  providerName: string;
  defaultModel: string;
  models: ModelPricing[];
  apiKeyPlaceholder: string;
  apiKeyUrl: string;
  apiKeyPrefix?: string;
  apiKeyPrefixError?: string;
}

export function ProviderSettingsForm({
  provider,
  providerName,
  defaultModel,
  models,
  apiKeyPlaceholder,
  apiKeyUrl,
  apiKeyPrefix,
  apiKeyPrefixError,
}: ProviderSettingsFormProps) {
  const {
    apiKey,
    setApiKey,
    model,
    setModel,
    temperature,
    setTemperature,
    showApiKey,
    setShowApiKey,
    isValid,
    handleSave,
    handleReset,
  } = useProviderSettings({
    provider,
    defaultModel,
    defaultTemperature: 0.3,
  });

  const handleTestConnection = async () => {
    if (!apiKey) {
      toast.error('Please enter an API key first');
      return;
    }

    if (apiKeyPrefix && !apiKey.startsWith(apiKeyPrefix)) {
      toast.error(apiKeyPrefixError || `Invalid API key format. ${providerName} keys start with "${apiKeyPrefix}"`);
    } else {
      toast.success('API key format looks valid!');
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
              {isValid ? `${providerName} Configured` : `${providerName} Not Configured`}
            </p>
            <p
              className={`text-sm mt-1 ${
                isValid
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-yellow-700 dark:text-yellow-300'
              }`}
            >
              {isValid
                ? `Ready to use. ${providerName} is configured and ready.`
                : `Configure your ${providerName} API key to enable AI features.`}
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
              {providerName} API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={apiKeyPlaceholder}
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
                  href={apiKeyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {providerName} Platform
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
              onChange={e => setTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">0.0 (Focused)</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">1.0 (Creative)</span>
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              <strong>Co to jest temperatura?</strong> Kontroluje losowość odpowiedzi AI. Niskie
              wartości (0.0-0.3) = deterministyczne, spójne odpowiedzi (idealne do kategoryzacji).
              Wysokie wartości (0.7-1.0) = bardziej kreatywne, zróżnicowane odpowiedzi.
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
                  Twoje klucze API są przechowywane <strong>lokalnie w przeglądarce</strong>{' '}
                  (localStorage). Nigdy nie są wysyłane na żaden zewnętrzny serwer - pozostają tylko
                  w Twojej przeglądarce. Dla produkcji zalecamy przeniesienie integracji AI na
                  backend.
                </p>
              </div>
            </div>
          </div>

          {/* Cost Estimate */}
          {models.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                💰 Przewidywany koszt za 1000 odpowiedzi (z API)
              </h3>
              <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1 max-h-48 overflow-y-auto">
                {models
                  .sort((a, b) => a.costPer1000Responses - b.costPer1000Responses)
                  .map(m => (
                    <p key={m.id} className="flex justify-between items-center py-1">
                      <span>• {m.name}</span>
                      <span className="font-bold">${m.costPer1000Responses.toFixed(4)}</span>
                    </p>
                  ))}
              </div>
            </div>
          )}

          {/* Model Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              <Cpu className="h-4 w-4" />
              Model
            </label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {models.length > 0 ? (
                models
                  .sort((a, b) => b.quality - a.quality)
                  .map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.description ? `- ${m.description}` : ''} ($
                      {m.costPer1000Responses.toFixed(4)}/1k)
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

