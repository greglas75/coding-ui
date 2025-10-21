/**
 * Step 3: Processing with real-time polling
 */
import { useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCodeframePolling } from '@/hooks/useCodeframePolling';
import { ProgressBar } from '../shared/ProgressBar';
import type { GenerationResponse } from '@/types/codeframe';

interface Step3ProcessingProps {
  generation: GenerationResponse | null;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export function Step3Processing({ generation, onComplete, onError }: Step3ProcessingProps) {
  const { status, progress, isComplete, isError, error } = useCodeframePolling(
    generation?.generation_id || null,
    {
      interval: 2000,
      onComplete: (completedStatus) => {
        if (completedStatus.status === 'completed') {
          setTimeout(onComplete, 1000); // Small delay to show 100%
        } else if (completedStatus.status === 'failed') {
          // Treat failed status as an error
          onError(
            new Error(
              completedStatus.result?.error?.message || 'Generation failed. Please try again.'
            )
          );
        }
      },
      onError,
    }
  );

  if (isError && error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Generation Failed
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const currentProgress = status?.progress || progress;
  const etaSeconds = status ? Math.ceil((generation?.estimated_time_seconds || 60) * (1 - currentProgress / 100)) : generation?.estimated_time_seconds || 60;

  return (
    <div className="text-center py-12 space-y-6">
      {/* Spinner */}
      <div className="relative inline-block">
        {isComplete ? (
          <CheckCircle2 className="h-20 w-20 text-green-500" />
        ) : (
          <Loader2 className="h-20 w-20 text-blue-500 animate-spin" />
        )}
      </div>

      {/* Title */}
      <div>
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          {isComplete ? 'Codebook Generated!' : 'Generating Codebook...'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {isComplete
            ? 'Processing complete. Review your results.'
            : `Using Claude AI to analyze ${generation?.n_answers || 0} responses`}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="max-w-md mx-auto">
        <ProgressBar
          value={currentProgress}
          max={100}
          color={isComplete ? 'green' : 'blue'}
          size="lg"
        />
      </div>

      {/* Status Details */}
      <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
        <p>{currentProgress}% complete</p>
        {!isComplete && etaSeconds > 0 && (
          <p>Estimated time remaining: {etaSeconds}s</p>
        )}
      </div>

      {/* Cluster Progress */}
      {status && status.n_clusters > 0 && (
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mt-8">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {status.n_completed}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Completed</p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {status.n_clusters - status.n_completed - (status.n_failed || 0)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Processing</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">
              {status.n_failed || 0}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Failed</p>
          </div>
        </div>
      )}

      {/* Processing Steps */}
      {!isComplete && (
        <div className="max-w-md mx-auto mt-8">
          <div className="text-left space-y-3">
            <ProcessingStep
              title="Clustering responses"
              isComplete={currentProgress > 20}
              isCurrent={currentProgress <= 20}
            />
            <ProcessingStep
              title="Generating themes with Claude AI"
              isComplete={currentProgress > 60}
              isCurrent={currentProgress > 20 && currentProgress <= 60}
            />
            <ProcessingStep
              title="Validating MECE principles"
              isComplete={currentProgress > 90}
              isCurrent={currentProgress > 60 && currentProgress <= 90}
            />
            <ProcessingStep
              title="Building hierarchy"
              isComplete={currentProgress >= 100}
              isCurrent={currentProgress > 90 && currentProgress < 100}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ProcessingStep({
  title,
  isComplete,
  isCurrent,
}: {
  title: string;
  isComplete: boolean;
  isCurrent: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      {isComplete ? (
        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
      ) : isCurrent ? (
        <Loader2 className="h-5 w-5 text-blue-500 flex-shrink-0 animate-spin" />
      ) : (
        <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
      )}
      <span
        className={
          isComplete || isCurrent
            ? 'text-gray-900 dark:text-white font-medium'
            : 'text-gray-500 dark:text-gray-400'
        }
      >
        {title}
      </span>
    </div>
  );
}
