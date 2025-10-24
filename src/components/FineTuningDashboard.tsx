import { AlertCircle, Brain, CheckCircle, Download, Play, TrendingUp, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ModelComparison } from '../lib/modelComparison';
import { TrainingDataExporter } from '../lib/trainingDataExporter';
import { simpleLogger } from '../utils/logger';

interface Props {
  categoryId?: number;
}

export function FineTuningDashboard({ categoryId }: Props) {
  const [step, setStep] = useState<'export' | 'info' | 'upload' | 'training' | 'complete'>('export');
  const [trainingDataCount, setTrainingDataCount] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [fileId, setFileId] = useState('');
  const [customModel, setCustomModel] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exporter = new TrainingDataExporter();
  const modelComparison = new ModelComparison();

  useEffect(() => {
    // Check if custom model already exists
    const existing = modelComparison.getCustomModel();
    if (existing) {
      setCustomModel(existing);
    }
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exporter.exportTrainingData(categoryId);
      setTrainingDataCount(result.count);

      if (result.count < 10) {
        toast.error(`Need at least 10 coded answers. You have ${result.count}`);
        setIsExporting(false);
        return;
      }

      // Get statistics
      const stats = exporter.getTrainingDataStats(result.data);
      setEstimatedCost(stats.estimatedCost);
      setEstimatedTime(stats.estimatedTime);

      toast.success(`Exported ${result.count} training examples to ${result.filename}`);
      setStep('info');
    } catch (error: any) {
      simpleLogger.error('Export error:', error);
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleActivateModel = () => {
    if (fileId.startsWith('ft:')) {
      modelComparison.setCustomModel(fileId);
      setCustomModel(fileId);
      toast.success('Custom model activated! AI will now use your trained model.');
      setStep('complete');
    } else {
      toast.error('Invalid model ID. Should start with "ft:"');
    }
  };

  const handleDeactivateModel = () => {
    modelComparison.clearCustomModel();
    setCustomModel(null);
    toast.success('Reverted to generic GPT-4 model');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-lg border border-purple-200 dark:border-purple-800 p-8">
        <div className="flex items-center gap-3 mb-6">
          <Brain size={32} className="text-purple-600 dark:text-purple-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Train Custom AI Model
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Fine-tune GPT on your coding patterns for 30% better accuracy
            </p>
          </div>
        </div>

        {/* Current Model Status */}
        {customModel && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                <div>
                  <div className="text-sm font-semibold text-green-700 dark:text-green-300">
                    Custom Model Active
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 font-mono">
                    {customModel.substring(0, 30)}...
                  </div>
                </div>
              </div>
              <button
                onClick={handleDeactivateModel}
                className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
              >
                Deactivate
              </button>
            </div>
          </div>
        )}

        {/* Steps Progress */}
        <div className="flex items-center justify-between mb-8 px-4">
          {['Export', 'Info', 'Upload', 'Train', 'Complete'].map((label, idx) => {
            const stepNames = ['export', 'info', 'upload', 'training', 'complete'];
            const currentIdx = stepNames.indexOf(step);
            const isActive = idx === currentIdx;
            const isCompleted = idx < currentIdx;

            return (
              <div key={idx} className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors
                  ${isActive ? 'bg-purple-600 text-white ring-4 ring-purple-200 dark:ring-purple-900' :
                    isCompleted ? 'bg-green-600 text-white' :
                    'bg-gray-200 dark:bg-neutral-800 text-gray-600 dark:text-gray-400'}
                `}>
                  {isCompleted ? <CheckCircle size={20} /> : idx + 1}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  isActive ? 'text-purple-600 dark:text-purple-400' :
                  isCompleted ? 'text-green-600 dark:text-green-400' :
                  'text-gray-500 dark:text-gray-400'
                }`}>
                  {label}
                </span>
                {idx < 4 && <div className="w-12 h-0.5 bg-gray-300 dark:bg-neutral-700 mx-4" />}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-6">
          {step === 'export' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Step 1: Export Training Data
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Export your coded answers as training data. You need at least <strong>10 examples</strong> for fine-tuning
                (100+ recommended for best results).
              </p>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-700 dark:text-blue-400">
                    <strong>Note:</strong> Only coded answers (with selected codes) will be exported.
                    Make sure you have enough manually coded answers for training.
                  </div>
                </div>
              </div>

              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Export Training Data
                  </>
                )}
              </button>
            </div>
          )}

          {step === 'info' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Step 2: Training Information
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {trainingDataCount}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Training Examples
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ${estimatedCost.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Estimated Cost
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {estimatedTime}min
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Estimated Time
                  </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    +30%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Expected Improvement
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <p className="font-semibold">Next Steps:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Go to <a href="https://platform.openai.com/finetune" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700">OpenAI Fine-tuning Dashboard</a></li>
                  <li>Click "Create" → "Upload training file"</li>
                  <li>Upload the .jsonl file you just downloaded</li>
                  <li>Start fine-tuning job (takes 15-30 minutes)</li>
                  <li>Copy the fine-tuned model ID when complete</li>
                </ol>
              </div>

              <button
                onClick={() => setStep('upload')}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                Next: Upload to OpenAI
                <Play size={18} />
              </button>
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Step 3: Activate Fine-tuned Model
              </h3>

              <p className="text-gray-700 dark:text-gray-300">
                After your fine-tuning job completes on OpenAI, paste the model ID here to activate it.
              </p>

              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-yellow-700 dark:text-yellow-400">
                    <strong>Model ID format:</strong> The ID should start with "ft:" (e.g., ft:gpt-4o-2024-08-06:personal::ABCxyz123)
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fine-tuned Model ID
                </label>
                <input
                  type="text"
                  value={fileId}
                  onChange={(e) => setFileId(e.target.value)}
                  placeholder="ft:gpt-4o-2024-08-06:personal::..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleActivateModel}
                disabled={!fileId.startsWith('ft:')}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Zap size={18} />
                Activate Custom Model
              </button>

              <button
                onClick={() => setStep('export')}
                className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-sm"
              >
                Back to Export
              </button>
            </div>
          )}

          {step === 'complete' && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                <CheckCircle size={48} className="text-green-600 dark:text-green-400 mx-auto mb-3" />
                <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Custom Model Activated!
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  AI will now use your trained model for better accuracy
                </div>
                <div className="bg-white dark:bg-neutral-900 rounded p-3 mb-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Model ID:</div>
                  <div className="font-mono text-xs text-gray-900 dark:text-white break-all">
                    {customModel}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
                  <TrendingUp size={24} className="text-blue-600 dark:text-blue-400 mb-2" />
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    Expected Improvement
                  </div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    +30%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Better accuracy on your data
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4">
                  <Brain size={24} className="text-purple-600 dark:text-purple-400 mb-2" />
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    Training Data
                  </div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {trainingDataCount}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Examples used
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-yellow-700 dark:text-yellow-400">
                    <strong>Tip:</strong> Re-train your model monthly with new coded answers to keep improving accuracy.
                    The more you code, the smarter your AI becomes!
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setStep('export');
                  setFileId('');
                }}
                className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-sm"
              >
                Train Another Model
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
