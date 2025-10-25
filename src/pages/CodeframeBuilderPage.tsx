/**
 * AI Codeframe Builder - Main Page
 * 6-step wizard for generating and applying AI-powered codebooks
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { StepIndicator } from '@/components/CodeframeBuilder/shared/StepIndicator';
import { Step0SelectType } from '@/components/CodeframeBuilder/steps/Step0SelectType';
import { Step1SelectData } from '@/components/CodeframeBuilder/steps/Step1SelectData';
import { Step2Configure } from '@/components/CodeframeBuilder/steps/Step2Configure';
import { Step3Processing } from '@/components/CodeframeBuilder/steps/Step3Processing';
import { Step4TreeEditor } from '@/components/CodeframeBuilder/steps/Step4TreeEditor';
import { Step5Apply } from '@/components/CodeframeBuilder/steps/Step5Apply';
import { useCodeframeGeneration } from '@/hooks/useCodeframeGeneration';
import type { CodeframeConfig } from '@/types/codeframe';

export function CodeframeBuilderPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState<CodeframeConfig>({
    category_id: null,
    algorithm_config: {
      min_cluster_size: 5,
      min_samples: 3,
      hierarchy_preference: 'adaptive',
    },
    target_language: 'en',
  });

  const { generation, isGenerating, generate, error } = useCodeframeGeneration();

  const steps = ['Select Type', 'Select Data', 'Configure', 'Processing', 'Review & Edit', 'Apply'];

  /**
   * Parse error and return user-friendly message
   */
  const getErrorMessage = (err: any): string => {
    // API response error
    if (err?.response?.data?.message) {
      return err.response.data.message;
    }

    // Network errors
    if (err?.message?.includes('Network Error') || err?.code === 'ERR_NETWORK') {
      return 'Cannot connect to server. Please check your internet connection and try again.';
    }

    // Timeout errors
    if (err?.message?.includes('timeout') || err?.code === 'ECONNABORTED') {
      return 'Request timed out. The server is taking too long to respond. Please try again.';
    }

    // Rate limiting (429)
    if (err?.response?.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }

    // Authentication errors (401/403)
    if (err?.response?.status === 401 || err?.response?.status === 403) {
      return 'Authentication failed. Please check your API keys configuration.';
    }

    // Server errors (500+)
    if (err?.response?.status >= 500) {
      return 'Server error occurred. Please try again in a few moments.';
    }

    // Python service down (connection refused)
    if (err?.message?.includes('ECONNREFUSED') || err?.message?.includes('connect')) {
      return 'Python service is not running. Please start the Python service and try again.';
    }

    // Redis connection errors
    if (err?.message?.toLowerCase().includes('redis')) {
      return 'Redis connection failed. Background jobs may not work. Please check Redis service.';
    }

    // Invalid API key
    if (err?.message?.toLowerCase().includes('api key') || err?.message?.toLowerCase().includes('unauthorized')) {
      return 'Invalid API key. Please check your ANTHROPIC_API_KEY configuration.';
    }

    // Not enough data
    if (err?.message?.toLowerCase().includes('not enough') || err?.message?.toLowerCase().includes('minimum')) {
      return 'Not enough answers to generate codeframe. Please add at least 50 uncategorized answers.';
    }

    // Generic error message
    if (err?.message) {
      return err.message;
    }

    return 'Failed to generate codeframe. Please try again.';
  };

  const handleGenerate = async () => {
    try {
      // Move to processing step immediately to show progress
      setCurrentStep(3);

      await generate(config);
      // Step3Processing component will handle the transition to step 4
      toast.success('Codeframe generation started successfully');
    } catch (err) {
      console.error('Generation failed:', err);

      const errorMessage = getErrorMessage(err);
      toast.error(errorMessage, {
        duration: 6000,
        description: 'Please fix the issue and try again',
      });

      // Reset to configure step so user can try again
      setCurrentStep(2);
    }
  };

  const handleComplete = () => {
    // Navigate to coding page to see applied codes
    navigate('/coding');
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          AI Codeframe Builder
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Automatically generate hierarchical codebooks using Claude AI
        </p>
      </div>

      {/* Step Indicator */}
      <StepIndicator steps={steps} currentStep={currentStep} className="mb-8" />

      {/* Main Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 min-h-[calc(100vh-300px)]">
        {currentStep === 0 && (
          <Step0SelectType
            config={config}
            onChange={setConfig}
            onNext={() => setCurrentStep(1)}
            onCancel={() => navigate('/categories')}
          />
        )}

        {currentStep === 1 && (
          <Step1SelectData
            config={config}
            onChange={setConfig}
            onNext={() => setCurrentStep(2)}
            onCancel={() => navigate('/categories')}
          />
        )}

        {currentStep === 2 && (
          <Step2Configure
            config={config}
            onChange={setConfig}
            onBack={() => setCurrentStep(1)}
            onGenerate={handleGenerate}
            isLoading={isGenerating}
          />
        )}

        {currentStep === 3 && (
          <Step3Processing
            generation={generation}
            onComplete={() => setCurrentStep(4)}
            onError={(error) => {
              simpleLogger.error('Processing error:', error);
              const errorMessage = getErrorMessage(error);
              toast.error(errorMessage, {
                duration: 6000,
                description: 'Generation failed. Returning to configuration.',
              });
              setCurrentStep(2);
            }}
          />
        )}

        {currentStep === 4 && (
          <Step4TreeEditor
            generation={generation}
            onSave={() => setCurrentStep(5)}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 5 && (
          <Step5Apply
            generation={generation}
            onComplete={handleComplete}
          />
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200 font-medium">Error</p>
          <p className="text-red-600 dark:text-red-300 text-sm mt-1">
            {error.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Reload Page
          </button>
        </div>
      )}

      {/* Info Footer */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">How it works</h3>
        <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
          <li>Choose your coding type (Brand Tracking, Open-ended, or Sentiment)</li>
          <li>Select a category with uncategorized answers</li>
          <li>Configure clustering algorithm and language settings</li>
          <li>AI analyzes responses and generates hierarchical codebook</li>
          <li>Review and edit the generated codes as needed</li>
          <li>Apply codes automatically to uncategorized answers</li>
        </ol>
      </div>
    </div>
  );
}
