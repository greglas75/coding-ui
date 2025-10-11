// ═══════════════════════════════════════════════════════════════
// 🎨 AI Settings Panel - Example Usage
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import AISettingsPanel from '../settings/AISettingsPanel';

export default function AISettingsExample() {
  const [settings, setSettings] = useState({
    useWebContext: true,
    useAutoTranslate: true,
    useAdaptiveSearch: true,
    useEvaluator: false,
    priority: 'balanced' as 'fast' | 'balanced' | 'accurate',
  });

  const handleChange = (updates: Partial<typeof settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    console.log('Settings updated:', { ...settings, ...updates });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            AI Settings Panel Example
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure how the AI behaves when processing responses. Changes are applied immediately.
          </p>
        </div>

        {/* AI Settings Panel */}
        <AISettingsPanel settings={settings} onChange={handleChange} />

        {/* Current Settings Display */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Current Settings (JSON)
          </h2>
          <pre className="bg-gray-100 dark:bg-neutral-800 rounded-lg p-4 overflow-x-auto text-sm">
            {JSON.stringify(settings, null, 2)}
          </pre>
        </div>

        {/* Integration Example */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Integration Example
          </h2>
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                1. Import the component
              </h3>
              <pre className="text-xs text-gray-600 dark:text-gray-400">
{`import AISettingsPanel from '@/components/settings/AISettingsPanel';`}
              </pre>
            </div>

            <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                2. Use in your component
              </h3>
              <pre className="text-xs text-gray-600 dark:text-gray-400">
{`<AISettingsPanel
  settings={project.aiSettings}
  onChange={(updates) => updateProjectSettings(updates)}
/>`}
              </pre>
            </div>

            <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                3. Use with LLM Client
              </h3>
              <pre className="text-xs text-gray-600 dark:text-gray-400">
{`import { generate } from '@/services/llmClient';

const result = await generate({
  input: 'User response text',
  task: 'coding',
  priority: settings.priority,
  projectSettings: {
    useWebContext: settings.useWebContext,
    useAutoTranslate: settings.useAutoTranslate,
    useAdaptiveSearch: settings.useAdaptiveSearch,
    useEvaluator: settings.useEvaluator,
  },
});`}
              </pre>
            </div>
          </div>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              🌐 Google Search Context
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Fetches relevant context from Google Search to help AI understand brands, products, and local terminology.
              Improves accuracy by 10-15%.
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              🌎 Auto-Translation
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Automatically translates non-English responses using Gemini-2.5-Pro. Supports 12+ languages with high accuracy.
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              🧠 Adaptive Search
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              AI decides when to fetch web context based on content analysis. Reduces API calls by 40-60% while maintaining quality.
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              🧪 Evaluator Model
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Second lightweight model evaluates quality and provides confidence scores. Adds ~400ms but catches low-quality outputs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

