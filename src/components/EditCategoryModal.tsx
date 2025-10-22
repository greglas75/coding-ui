import { Settings, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getTemplate, type TemplatePreset } from '../config/DefaultTemplates';
import { useAIPricing } from '../hooks/useAIPricing';
import { TestPromptModal } from './TestPromptModal';

interface EditCategoryModalProps {
  category: {
    id: number;
    name: string;
    google_name?: string;
    description?: string;
    template?: string;
    preset?: string;
    model?: string; // Legacy column
    openai_model?: string; // ✅ OpenAI model
    claude_model?: string; // ✅ Claude model
    gemini_model?: string; // ✅ Gemini model
    vision_model?: string; // ✅ Vision model for image analysis
    llm_preset?: string; // ✅ New column
    gpt_template?: string; // ✅ New column
    brands_sorting?: string;
    min_length?: number;
    max_length?: number;
    use_web_context?: boolean;
    sentiment_enabled?: boolean;
    sentiment_mode?: 'smart' | 'always' | 'never';
  };
  onClose: () => void;
  onSave: (data: {
    name: string;
    googleName: string;
    description: string;
    preset: string;
    model: string; // ✅ Unified model (supports OpenAI, Anthropic, Google)
    visionModel: string; // ✅ Vision model for image analysis
    template: string;
    brandsSorting: string;
    minLength: number;
    maxLength: number;
    useWebContext: boolean;
    sentimentEnabled: boolean;
    sentimentMode: 'smart' | 'always' | 'never';
  }) => Promise<void>;
}

export function EditCategoryModal({ category, onClose, onSave }: EditCategoryModalProps) {
  const [fade, setFade] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);

  // ✅ Use live AI pricing data instead of static cache
  const { getPricingForProvider, isLoading: pricingLoading } = useAIPricing();

  useEffect(() => {
    setTimeout(() => setFade(true), 50);
    return () => setFade(false);
  }, []);

  // 🔧 FIX: Close modal with ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const [form, setForm] = useState({
    name: category.name || '',
    googleName: category.google_name || '',
    description: category.description || '',
    preset: category.llm_preset || category.preset || 'LLM Proper Name', // ✅ New column first, then legacy

    // ✅ Unified model selection (supports all providers)
    model:
      category.openai_model ||
      category.claude_model ||
      category.gemini_model ||
      category.model ||
      'gpt-4o-mini',

    // ✅ Vision model for image analysis (default: cheapest Gemini)
    visionModel: category.vision_model || 'gemini-2.5-flash-lite',

    template: category.gpt_template || category.template || '', // ✅ New column first, then legacy
    brandsSorting: category.brands_sorting || 'Alphanumerical',
    minLength: category.min_length || 0,
    maxLength: category.max_length || 0,
    useWebContext: category.use_web_context ?? true, // default: true
    sentimentEnabled: category.sentiment_enabled ?? false,
    sentimentMode: (category.sentiment_mode || 'smart') as 'smart' | 'always' | 'never',
  });

  // Auto-fill template on modal open if it's empty
  useEffect(() => {
    if ((!form.template || form.template.trim().length === 0) && form.preset !== 'Custom') {
      // Don't fill placeholders - keep them dynamic
      const rawTemplate = getTemplate(form.preset as TemplatePreset);
      if (rawTemplate) {
        setForm(prev => ({ ...prev, template: rawTemplate }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // ✅ Load ALL models from live pricing data (auto-updated every 24h)
  const allModels = [
    ...getPricingForProvider('openai')
      .filter((m: any) => m.available)
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        provider: '🤖 OpenAI',
        description: m.description,
        costPer1M: m.costPer1000Responses,
      })),
    ...getPricingForProvider('anthropic')
      .filter((m: any) => m.available)
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        provider: '🧠 Anthropic',
        description: m.description,
        costPer1M: m.costPer1000Responses,
      })),
    ...getPricingForProvider('google')
      .filter((m: any) => m.available)
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        provider: '🔮 Google',
        description: m.description,
        costPer1M: m.costPer1000Responses,
      })),
  ];

  // ✅ Vision-capable models for image analysis (cheaper options first)
  const visionModels = [
    ...getPricingForProvider('google')
      .filter((m: any) => m.available)
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        provider: '🔮 Google',
        description: m.description,
        costPer1M: m.costPer1000Responses,
      })),
    ...getPricingForProvider('openai')
      .filter((m: any) => m.available && (m.id.startsWith('gpt-4o') || m.id.startsWith('gpt-5')))
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        provider: '🤖 OpenAI',
        description: m.description,
        costPer1M: m.costPer1000Responses,
      })),
    ...getPricingForProvider('anthropic')
      .filter((m: any) => m.available && !m.id.includes('-3'))
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        provider: '🧠 Anthropic',
        description: m.description,
        costPer1M: m.costPer1000Responses,
      })),
  ].sort((a, b) => a.costPer1M - b.costPer1M); // Sort by price (cheapest first)

  const handleSave = async (closeAfter = false) => {
    console.log('Saving:', form);
    await onSave(form);
    if (closeAfter) onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 flex items-center justify-center z-50 transition-opacity duration-300 ${
          fade ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 w-full max-w-6xl shadow-lg transform transition-all scale-100">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Settings size={20} />
              Edit Category Settings
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>

          {/* 2-Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column (2/3 width) */}
            <div className="col-span-1 md:col-span-2 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  GPT Template
                </label>
                <textarea
                  rows={14}
                  value={form.template}
                  onChange={e => setForm({ ...form, template: e.target.value })}
                  className="w-full font-mono border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter GPT system prompt template..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  💡 Available placeholders:{' '}
                  <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-blue-600 dark:text-blue-400">
                    {'{category}'}
                  </code>{' '}
                  <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-blue-600 dark:text-blue-400">
                    {'{searchTerm}'}
                  </code>{' '}
                  <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-blue-600 dark:text-blue-400">
                    {'{codes}'}
                  </code>
                  {' - will be replaced when AI runs'}
                </p>
                <button
                  onClick={() => setTestModalOpen(true)}
                  className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium flex items-center gap-2"
                  type="button"
                >
                  🧪 Test Prompt
                </button>
              </div>
            </div>

            {/* Right Column (1/3 width) */}
            <div className="col-span-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Google Search Name
                </label>
                <input
                  type="text"
                  value={form.googleName}
                  onChange={e => setForm({ ...form, googleName: e.target.value })}
                  className="w-full border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Categorization Preset
                </label>
                <select
                  value={form.preset}
                  onChange={e => {
                    const newPreset = e.target.value as TemplatePreset;
                    setForm({ ...form, preset: newPreset });

                    // Load template with placeholders (unless Custom)
                    if (newPreset !== 'Custom') {
                      const rawTemplate = getTemplate(newPreset);
                      if (rawTemplate) {
                        setForm(prev => ({ ...prev, template: rawTemplate }));
                      }
                    }
                  }}
                  className="w-full border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option>LLM Proper Name</option>
                  <option>LLM Brand List</option>
                  <option>LLM First Letter</option>
                  <option>LLM Sentiment</option>
                  <option>LLM Entity Detection</option>
                  <option>LLM Description Extractor</option>
                  <option>LLM Translation Validator</option>
                  <option>LLM Geo Brand Detector</option>
                  <option>LLM Yes/No</option>
                  <option>Custom</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  💡 Changing preset will auto-fill the template below
                </p>
              </div>

              {/* ✅ Unified AI Model Selection (All Providers) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  🤖 AI Model (Text Analysis)
                </label>
                <select
                  value={form.model}
                  onChange={e => setForm({ ...form, model: e.target.value })}
                  disabled={pricingLoading}
                  className="w-full border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                >
                  {pricingLoading ? (
                    <option>🔄 Loading models...</option>
                  ) : (
                    allModels.map((model: any) => (
                      <option key={model.id} value={model.id}>
                        {model.provider} {model.name} - ${model.costPer1M}/1M
                      </option>
                    ))
                  )}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  💡 For categorizing user responses (text)
                </p>
              </div>

              {/* ✅ Vision Model Selection (Image Analysis) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  👁️ Vision Model (Image Analysis)
                </label>
                <select
                  value={form.visionModel}
                  onChange={e => setForm({ ...form, visionModel: e.target.value })}
                  className="w-full border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                >
                  {visionModels.map((model: any) => (
                    <option key={model.id} value={model.id}>
                      {model.provider} {model.name} - ${model.costPer1M}/1M
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  💡 For analyzing Google Images (logos, products, places)
                </p>
                <div className="mt-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2">
                  <p className="text-xs text-green-800 dark:text-green-200">
                    ⭐ <strong>Recommended:</strong> Gemini 2.5 Flash Lite (cheapest, fast, accurate
                    for brand detection)
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Brands Sorting
                </label>
                <select
                  value={form.brandsSorting}
                  onChange={e => setForm({ ...form, brandsSorting: e.target.value })}
                  className="w-full border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option>Alphanumerical</option>
                  <option>Creation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Minimum Length of Answer
                </label>
                <input
                  type="number"
                  value={form.minLength}
                  onChange={e => setForm({ ...form, minLength: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  title="Shorter and longer answers would be marked as Gibberish. Set 0 or empty to skip validation."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Maximum Length of Answer
                </label>
                <input
                  type="number"
                  value={form.maxLength}
                  onChange={e => setForm({ ...form, maxLength: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  title="Shorter and longer answers would be marked as Gibberish. Set 0 or empty to skip validation."
                />
              </div>

              {/* Web Context Toggle */}
              <div className="pt-4 border-t border-gray-200 dark:border-neutral-700">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.useWebContext}
                    onChange={e => setForm({ ...form, useWebContext: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Use Google Search Context
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      💡 Enriches AI prompts with web context (brand names, local terms, slang).
                      Helps with regional and trending topics.
                    </p>
                  </div>
                </label>
              </div>

              {/* Sentiment Analysis Section */}
              <div className="pt-4 border-t border-gray-200 dark:border-neutral-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  😊 Sentiment Analysis
                </h3>

                {/* Enable Toggle */}
                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={form.sentimentEnabled}
                    onChange={e => setForm({ ...form, sentimentEnabled: e.target.checked })}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enable Sentiment Analysis
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Analyze emotional tone (positive, negative, neutral, mixed)
                    </p>
                  </div>
                </label>

                {/* Mode Selector (only if enabled) */}
                {form.sentimentEnabled && (
                  <>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Detection Mode
                      </label>
                      <select
                        value={form.sentimentMode}
                        onChange={e =>
                          setForm({
                            ...form,
                            sentimentMode: e.target.value as 'smart' | 'always' | 'never',
                          })
                        }
                        className="w-full border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                      >
                        <option value="smart">
                          🧠 Smart (AI decides per answer) - Recommended
                        </option>
                        <option value="always">✅ Always (for every answer)</option>
                        <option value="never">❌ Never (disabled)</option>
                      </select>
                    </div>

                    {/* Mode Explanation */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs mb-3">
                      {form.sentimentMode === 'smart' && (
                        <p className="text-blue-900 dark:text-blue-200">
                          ✨ <strong>Smart Mode:</strong> AI automatically detects if sentiment
                          makes sense for each answer. Skips brand names, product IDs, and factual
                          statements. Saves ~12% on costs.
                        </p>
                      )}
                      {form.sentimentMode === 'always' && (
                        <p className="text-blue-900 dark:text-blue-200">
                          ⚡ <strong>Always Mode:</strong> Sentiment calculated for every answer,
                          even short ones. Adds ~20% to AI costs. Use for pure opinion surveys.
                        </p>
                      )}
                      {form.sentimentMode === 'never' && (
                        <p className="text-blue-900 dark:text-blue-200">
                          🚫 <strong>Never Mode:</strong> Sentiment completely disabled. Only code
                          suggestions provided. No extra cost.
                        </p>
                      )}
                    </div>

                    {/* Use Cases */}
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-xs">
                      <p className="font-medium mb-2 text-green-900 dark:text-green-200">
                        💡 Best used for:
                      </p>
                      <ul className="space-y-1 text-green-800 dark:text-green-300">
                        <li className="flex items-start gap-1.5">
                          <span className="text-green-600 dark:text-green-400 mt-0.5">✅</span>
                          <span>Customer feedback & reviews</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-green-600 dark:text-green-400 mt-0.5">✅</span>
                          <span>Open-ended opinion questions</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-green-600 dark:text-green-400 mt-0.5">✅</span>
                          <span>Experience descriptions</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-red-600 dark:text-red-400 mt-0.5">❌</span>
                          <span>Brand identification only</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-red-600 dark:text-red-400 mt-0.5">❌</span>
                          <span>Product catalogs or lists</span>
                        </li>
                      </ul>
                    </div>

                    {/* Cost Notice */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-xs text-gray-600 dark:text-gray-400 mt-3">
                      <strong>Cost impact:</strong> Sentiment adds ~12-20% to categorization costs.
                      Smart mode optimizes by skipping non-applicable answers.
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => handleSave(false)}
              className="px-4 py-2 bg-gray-200 dark:bg-neutral-700 hover:bg-gray-300 dark:hover:bg-neutral-600 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium transition-colors"
            >
              Save Changes
            </button>
            <button
              onClick={() => handleSave(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              Save & Close
            </button>
          </div>
        </div>
      </div>

      {/* Test Prompt Modal */}
      <TestPromptModal
        open={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        template={form.template}
        model={form.model}
      />
    </>
  );
}
