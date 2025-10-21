/**
 * Step indicator component for wizard navigation
 */
import { Check } from 'lucide-react';
import { clsx } from 'clsx';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className={className}>
      <ol role="list" className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isComplete = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <li key={step} className="relative flex-1">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={clsx(
                    'absolute left-1/2 top-5 h-0.5 w-full',
                    isComplete || isCurrent
                      ? 'bg-blue-600 dark:bg-blue-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  )}
                  aria-hidden="true"
                />
              )}

              <div className="group relative flex flex-col items-center">
                {/* Step circle */}
                <span
                  className={clsx(
                    'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2',
                    'transition-colors duration-200',
                    isComplete &&
                      'border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500',
                    isCurrent &&
                      'border-blue-600 bg-white dark:border-blue-500 dark:bg-gray-800',
                    isUpcoming && 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5 text-white" aria-hidden="true" />
                  ) : (
                    <span
                      className={clsx(
                        'text-sm font-semibold',
                        isCurrent
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-500 dark:text-gray-400'
                      )}
                    >
                      {stepNumber}
                    </span>
                  )}
                </span>

                {/* Step name */}
                <span
                  className={clsx(
                    'mt-2 text-sm font-medium transition-colors duration-200',
                    isCurrent
                      ? 'text-blue-600 dark:text-blue-400'
                      : isComplete
                      ? 'text-gray-900 dark:text-gray-200'
                      : 'text-gray-500 dark:text-gray-400'
                  )}
                >
                  {step}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
