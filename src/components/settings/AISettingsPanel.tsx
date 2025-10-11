// ═══════════════════════════════════════════════════════════════
// 🤖 AI Settings Panel - Configuration for LLM behavior
// ═══════════════════════════════════════════════════════════════

import { Info } from 'lucide-react';

interface AISettingsPanelProps {
  settings: {
    useWebContext?: boolean;
    useAutoTranslate?: boolean;
    useAdaptiveSearch?: boolean;
    useEvaluator?: boolean;
    priority?: 'fast' | 'balanced' | 'accurate';
  };
  onChange: (updates: Partial<AISettingsPanelProps['settings']>) => void;
}

export default function AISettingsPanel({ settings, onChange }: AISettingsPanelProps) {
  const {
    useWebContext = true,
    useAutoTranslate = true,
    useAdaptiveSearch = true,
    useEvaluator = false,
    priority = 'balanced',
  } = settings;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          🤖 AI Configuration
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Control how the AI behaves when coding and validating responses.
        </p>
      </div>

      {/* Content */}
      <div className="px-6 py-4 space-y-6">
        {/* Use Google Search Context */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="useWebContext"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
            >
              Use Google Search Context
              <div className="group relative">
                <Info size={16} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  Fetches relevant context from Google Search to help AI understand brands, products, and local terminology.
                </div>
              </div>
            </label>
            <button
              id="useWebContext"
              type="button"
              role="switch"
              aria-checked={useWebContext}
              onClick={() => onChange({ useWebContext: !useWebContext })}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${useWebContext ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${useWebContext ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 ml-1">
            Adds factual context from Google Search to improve model accuracy for brands, products, and regional terms.
          </p>
        </div>

        {/* Auto-translate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="useAutoTranslate"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
            >
              Auto-translate to English
              <div className="group relative">
                <Info size={16} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  Automatically translates non-English responses to English using Gemini-2.5-Pro before AI processing.
                </div>
              </div>
            </label>
            <button
              id="useAutoTranslate"
              type="button"
              role="switch"
              aria-checked={useAutoTranslate}
              onClick={() => onChange({ useAutoTranslate: !useAutoTranslate })}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${useAutoTranslate ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${useAutoTranslate ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 ml-1">
            Automatically translates non-English text before processing by LLM. Improves accuracy for multilingual data.
          </p>
        </div>

        {/* Adaptive Search */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="useAdaptiveSearch"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
            >
              Use Adaptive Search
              <div className="group relative">
                <Info size={16} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  AI decides when to fetch web context based on content (e.g., detects proper nouns, brands). Saves API calls.
                </div>
              </div>
            </label>
            <button
              id="useAdaptiveSearch"
              type="button"
              role="switch"
              aria-checked={useAdaptiveSearch}
              onClick={() => onChange({ useAdaptiveSearch: !useAdaptiveSearch })}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${useAdaptiveSearch ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${useAdaptiveSearch ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 ml-1">
            AI intelligently decides when external search is needed (for named entities, brands, etc.). Reduces unnecessary API calls.
          </p>
        </div>

        {/* Evaluator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="useEvaluator"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
            >
              Use Evaluator Model
              <div className="group relative">
                <Info size={16} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  Runs a second lightweight model (GPT-4.5-Turbo) to evaluate quality and confidence of AI-generated codes.
                </div>
              </div>
            </label>
            <button
              id="useEvaluator"
              type="button"
              role="switch"
              aria-checked={useEvaluator}
              onClick={() => onChange({ useEvaluator: !useEvaluator })}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${useEvaluator ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${useEvaluator ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 ml-1">
            Runs a second lightweight model to evaluate AI-generated coding quality. Adds ~400ms latency but improves confidence.
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-neutral-700 my-4" />

        {/* AI Mode Select */}
        <div className="space-y-2">
          <label
            htmlFor="priority"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
          >
            AI Mode
            <div className="group relative">
              <Info size={16} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                <div className="space-y-1">
                  <div><strong>Fast:</strong> Gemini-2.5-Flash (~300ms, $0.075/1M)</div>
                  <div><strong>Balanced:</strong> Claude-3.5-Sonnet (~700ms, $3/1M)</div>
                  <div><strong>Accurate:</strong> GPT-5 (~1200ms, $15/1M)</div>
                </div>
              </div>
            </div>
          </label>

          <select
            id="priority"
            value={priority}
            onChange={(e) => onChange({ priority: e.target.value as 'fast' | 'balanced' | 'accurate' })}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="fast">⚡ Fast — Lower cost, instant processing (Gemini-2.5-Flash)</option>
            <option value="balanced">⚙️ Balanced — Default trade-off (Claude-3.5-Sonnet)</option>
            <option value="accurate">🎯 Accurate — Best quality, slower (GPT-5)</option>
          </select>

          <p className="text-xs text-gray-500 dark:text-gray-400 ml-1">
            Choose between speed, cost and accuracy preferences. Affects which AI model is used for coding.
          </p>
        </div>

        {/* Performance Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 dark:text-blue-400 mt-0.5">
              <Info size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Current Configuration Impact
              </h3>
              <div className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
                <div className="flex justify-between">
                  <span>Estimated Latency:</span>
                  <span className="font-mono font-semibold">
                    {priority === 'fast' ? '~0.3-0.5s' : priority === 'balanced' ? '~0.7-1.0s' : '~1.2-1.5s'}
                    {useEvaluator && ' +0.4s'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Cost per Request:</span>
                  <span className="font-mono font-semibold">
                    {priority === 'fast' ? '$0.0001' : priority === 'balanced' ? '$0.0003' : '$0.0015'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Quality Score:</span>
                  <span className="font-mono font-semibold">
                    {priority === 'fast' ? '8.0/10' : priority === 'balanced' ? '9.0/10' : '10/10'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

