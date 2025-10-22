/**
 * Step 0: Select Coding Type
 * Choose between Brand Tracking, Open-ended, or Sentiment Analysis
 */
import { Lightbulb, MessageSquare, Heart } from 'lucide-react';
import type { CodeframeConfig, CodingType } from '@/types/codeframe';

interface Step0SelectTypeProps {
  config: CodeframeConfig;
  onChange: (config: CodeframeConfig) => void;
  onNext: () => void;
  onCancel: () => void;
}

interface TypeOption {
  type: CodingType;
  icon: typeof Lightbulb;
  title: string;
  description: string;
  examples: string[];
  features: string[];
}

const typeOptions: TypeOption[] = [
  {
    type: 'brand',
    icon: Lightbulb,
    title: 'Brand Tracking',
    description: 'Track brand mentions, associations, and perceptions over time',
    examples: [
      'Brand awareness studies',
      'Product perception analysis',
      'Competitive positioning',
    ],
    features: [
      'Brand mention detection',
      'Sentiment per brand',
      'Association mapping',
      'Time-series tracking',
    ],
  },
  {
    type: 'open-ended',
    icon: MessageSquare,
    title: 'Open-ended Analysis',
    description: 'Discover themes and patterns in free-text responses',
    examples: [
      'Customer feedback analysis',
      'Survey verbatims',
      'Product reviews',
    ],
    features: [
      'Automatic theme discovery',
      'Hierarchical coding',
      'MECE validation',
      'Flexible categorization',
    ],
  },
  {
    type: 'sentiment',
    icon: Heart,
    title: 'Sentiment Analysis',
    description: 'Analyze emotional tone and opinions in responses',
    examples: [
      'Customer satisfaction surveys',
      'Social media monitoring',
      'Employee feedback',
    ],
    features: [
      'Multi-level sentiment (positive/negative/neutral)',
      'Emotion detection',
      'Aspect-based sentiment',
      'Intensity scoring',
    ],
  },
];

export function Step0SelectType({
  config,
  onChange,
  onNext,
  onCancel,
}: Step0SelectTypeProps) {
  const selectedType = config.coding_type;

  const handleSelectType = (type: CodingType) => {
    onChange({
      ...config,
      coding_type: type,
    });
  };

  const canProceed = !!selectedType;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Select Coding Type
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Choose the type of analysis you want to perform on your text data.
        </p>
      </div>

      {/* Type Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {typeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedType === option.type;

          return (
            <button
              key={option.type}
              type="button"
              data-testid={`type-${option.type}`}
              onClick={() => handleSelectType(option.type)}
              className={`p-6 border-2 rounded-lg text-left transition-all hover:shadow-lg ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              }`}
            >
              {/* Icon & Title */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`p-2 rounded-lg ${
                    isSelected
                      ? 'bg-blue-100 dark:bg-blue-800'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 ${
                      isSelected
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  />
                </div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                  {option.title}
                </h3>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {option.description}
              </p>

              {/* Examples */}
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Use Cases
                </h4>
                <ul className="space-y-1">
                  {option.examples.map((example, idx) => (
                    <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      {example}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Features */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Features
                </h4>
                <ul className="space-y-1">
                  {option.features.map((feature, idx) => (
                    <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 font-medium text-sm">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Selected
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Info Box */}
      {selectedType && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
            Next Steps
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-300">
            {selectedType === 'brand' &&
              'You will select categories and configure brand tracking parameters.'}
            {selectedType === 'open-ended' &&
              'You will select data and configure clustering algorithms for theme discovery.'}
            {selectedType === 'sentiment' &&
              'You will select data and configure sentiment analysis settings.'}
          </p>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex justify-between pt-6 border-t dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className={`px-6 py-2 rounded-lg font-medium transition ${
            canProceed
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          Next: Select Data →
        </button>
      </div>
    </div>
  );
}
