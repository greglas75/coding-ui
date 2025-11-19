/**
 * Step 2: Configure algorithm settings
 */
import { Settings, Info, Sparkles } from 'lucide-react';
import type { CodeframeConfig } from '@/types/codeframe';

interface Step2ConfigureProps {
  config: CodeframeConfig;
  onChange: (config: CodeframeConfig) => void;
  onBack: () => void;
  onGenerate: () => void;
  isLoading: boolean;
}

export function Step2Configure({
  config,
  onChange,
  onBack,
  onGenerate,
  isLoading,
}: Step2ConfigureProps) {
  const updateAlgorithmConfig = (key: string, value: string | number | boolean) => {
    onChange({
      ...config,
      algorithm_config: {
        ...config.algorithm_config,
        [key]: value,
      },
    });
  };

  const estimatedCost = 0.05; // Rough estimate, can be calculated based on answers
  const isBrandCoding = config.coding_type === 'brand';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Configure Generation
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {isBrandCoding
            ? 'Configure brand detection and validation settings.'
            : 'Adjust algorithm settings to optimize the codebook quality.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Clustering Settings - Hidden for Brand Coding */}
        {!isBrandCoding && (
          <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Clustering Settings
          </h3>

          {/* Min Cluster Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Minimum Cluster Size
              <span className="ml-2 text-gray-500 font-normal">
                ({config.algorithm_config.min_cluster_size})
              </span>
            </label>
            <input
              type="range"
              min="2"
              max="20"
              value={config.algorithm_config.min_cluster_size}
              onChange={(e) =>
                updateAlgorithmConfig('min_cluster_size', parseInt(e.target.value))
              }
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Smaller = more themes, larger = fewer themes
            </p>
          </div>

          {/* Min Samples */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Minimum Samples
              <span className="ml-2 text-gray-500 font-normal">
                ({config.algorithm_config.min_samples})
              </span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={config.algorithm_config.min_samples}
              onChange={(e) => updateAlgorithmConfig('min_samples', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Controls cluster density (higher = stricter)
            </p>
          </div>

          {/* Hierarchy Preference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hierarchy Preference
            </label>
            <select
              value={config.algorithm_config.hierarchy_preference}
              onChange={(e) =>
                updateAlgorithmConfig(
                  'hierarchy_preference',
                  e.target.value
                )
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="adaptive">Adaptive (Recommended)</option>
              <option value="flat">Flat (No hierarchy)</option>
              <option value="two_level">Two Levels (Themes → Codes)</option>
              <option value="three_level">Three Levels (Deep hierarchy)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Let Claude decide the best structure
            </p>
          </div>
        </div>
        )}

        {/* Language & Advanced */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Output Settings
          </h3>

          {/* Target Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Language
            </label>
            <select
              value={config.target_language}
              onChange={(e) =>
                onChange({
                  ...config,
                  target_language: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="en">English</option>
              <option value="pl">Polish</option>
              <option value="de">German</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Code names will be generated in this language
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-200 mb-1">
                  AI-Powered Generation
                </p>
                <p className="text-blue-800 dark:text-blue-300">
                  Uses Claude Sonnet 4.5 for intelligent code generation with chain-of-thought
                  reasoning and MECE validation.
                </p>
              </div>
            </div>
          </div>

          {/* Cost Estimate */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Estimated Cost
            </h4>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                ${estimatedCost.toFixed(2)}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">USD</span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Based on estimated Claude API usage
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 dark:text-yellow-200 mb-2">
          Ready to Generate
        </h4>
        <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-300">
          {isBrandCoding ? (
            <>
              <li>• Analysis type: Brand Tracking</li>
              <li>• Brand detection: Google-verified</li>
              <li>• Target language: {config.target_language.toUpperCase()}</li>
              <li>• Processing time: ~20-40 seconds (estimated)</li>
            </>
          ) : (
            <>
              <li>• Cluster size: {config.algorithm_config.min_cluster_size}+ answers per theme</li>
              <li>• Hierarchy: {config.algorithm_config.hierarchy_preference}</li>
              <li>• Target language: {config.target_language.toUpperCase()}</li>
              <li>• Processing time: ~30-60 seconds (estimated)</li>
            </>
          )}
        </ul>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-between pt-6 border-t dark:border-gray-700">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition disabled:opacity-50"
        >
          ← Back
        </button>

        <button
          type="button"
          onClick={onGenerate}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Codebook
            </>
          )}
        </button>
      </div>
    </div>
  );
}
