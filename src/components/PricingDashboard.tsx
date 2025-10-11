/**
 * 💰 Pricing Dashboard Component
 *
 * Displays live AI model pricing data from API
 */

import { AlertCircle, RefreshCw } from 'lucide-react';
import { useAIPricing } from '../hooks/useAIPricing';

interface PricingDashboardProps {
  filterProvider?: 'openai' | 'anthropic' | 'google' | null;
}

export function PricingDashboard({ filterProvider }: PricingDashboardProps) {
  const {
    pricing,
    isLoading,
    isError,
    lastUpdated,
    dataSource,
    refresh,
    getCheapestByProvider
  } = useAIPricing();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-zinc-600 dark:text-zinc-400">Ładowanie cen...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-100">
              Błąd ładowania cen
            </h3>
            <p className="text-sm text-red-800 dark:text-red-200 mt-1">
              Nie udało się pobrać danych o cenach. Upewnij się, że serwer API działa.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!pricing) return null;

  const cheapest = getCheapestByProvider();

  // Filter models based on selected provider
  const getFilteredModels = () => {
    if (!filterProvider) {
      // Show all models
      return [...pricing.models.openai, ...pricing.models.anthropic, ...pricing.models.google];
    }

    // Show only models from selected provider
    return pricing.models[filterProvider] || [];
  };

  const filteredModels = getFilteredModels();

  // Provider display names
  const providerNames = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            📊 Live Pricing Dashboard
            {filterProvider && (
              <span className="ml-2 text-sm font-normal text-blue-600 dark:text-blue-400">
                ({providerNames[filterProvider]} tylko)
              </span>
            )}
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Dane z API • Ostatnia aktualizacja:{' '}
            {lastUpdated ? new Date(lastUpdated).toLocaleString('pl-PL') : 'N/A'}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">
            Źródło danych: <span className="font-mono">{dataSource}</span>
            {filterProvider && <span className="ml-2">• Filtr: {providerNames[filterProvider]}</span>}
          </p>
        </div>

        <button
          onClick={refresh}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Odśwież
        </button>
      </div>

      {/* Stats Grid */}
      {!filterProvider && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* OpenAI */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              🤖 OpenAI
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {pricing.models.openai.length}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              modeli dostępnych
            </div>
            {cheapest && (
              <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  Najtańszy: <strong>{cheapest.openai.name}</strong>
                </div>
                <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                  ${cheapest.openai.costPer1000Responses.toFixed(4)}/1k
                </div>
              </div>
            )}
          </div>

          {/* Anthropic */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              🧠 Anthropic
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {pricing.models.anthropic.length}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              modeli dostępnych
            </div>
            {cheapest && (
              <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  Najtańszy: <strong>{cheapest.anthropic.name}</strong>
                </div>
                <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                  ${cheapest.anthropic.costPer1000Responses.toFixed(4)}/1k
                </div>
              </div>
            )}
          </div>

          {/* Google */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              ⚡ Google
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {pricing.models.google.length}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              modeli dostępnych
            </div>
            {cheapest && (
              <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  Najtańszy: <strong>{cheapest.google.name}</strong>
                </div>
                <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                  ${cheapest.google.costPer1000Responses.toFixed(4)}/1k
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filtered Stats - Single Card */}
      {filterProvider && (
        <div className="mb-4">
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  {filterProvider === 'openai' && '🤖 OpenAI'}
                  {filterProvider === 'anthropic' && '🧠 Anthropic'}
                  {filterProvider === 'google' && '⚡ Google'}
                </div>
                <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  {filteredModels.length}
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  modeli dostępnych
                </div>
              </div>
              {cheapest && cheapest[filterProvider] && (
                <div className="text-right">
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                    Najtańszy model:
                  </div>
                  <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {cheapest[filterProvider].name}
                  </div>
                  <div className="text-xl font-semibold text-green-600 dark:text-green-400 mt-1">
                    ${cheapest[filterProvider].costPer1000Responses.toFixed(4)}/1k
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* All Models Table */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
            {filterProvider ? `Modele ${providerNames[filterProvider]}` : 'Wszystkie Modele'}
          </h4>
        </div>
        <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">Model</th>
                {!filterProvider && (
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">Provider</th>
                )}
                <th className="px-4 py-2 text-right text-xs font-medium text-zinc-600 dark:text-zinc-400">Koszt/1k</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-zinc-600 dark:text-zinc-400">Jakość</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {filteredModels
                .sort((a, b) => a.costPer1000Responses - b.costPer1000Responses)
                .map((model) => (
                  <tr key={model.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <td className="px-4 py-2 text-zinc-900 dark:text-zinc-100">
                      {model.name}
                      {model.description && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{model.description}</div>
                      )}
                    </td>
                    {!filterProvider && (
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                          {model.provider}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-2 text-right font-mono text-zinc-900 dark:text-zinc-100">
                      ${model.costPer1000Responses.toFixed(4)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end items-center gap-1">
                        <div className="text-zinc-900 dark:text-zinc-100">{model.quality}/10</div>
                        <div className="w-16 bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(model.quality / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="mt-4 text-xs text-zinc-600 dark:text-zinc-400 text-center">
        💡 Ceny są automatycznie aktualizowane co 24 godziny z cache
      </div>
    </div>
  );
}

