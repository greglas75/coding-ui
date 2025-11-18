/**
 * useBatchProcessing Hook
 *
 * Manages batch AI processing:
 * - Batch processor instance
 * - Progress tracking
 * - Batch selection integration
 */

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import type { Answer } from '../../../types';
import { BatchAIProcessor, type BatchProgress } from '../../../lib/batchAIProcessor';
import type { UseBatchSelectionReturn } from '../../../hooks/useBatchSelection';

interface UseBatchProcessingOptions {
  batchSelection: UseBatchSelectionReturn;
  localAnswers: Answer[];
}

interface UseBatchProcessingReturn {
  batchProcessor: BatchAIProcessor;
  batchProgress: BatchProgress | null;
  setBatchProgress: React.Dispatch<React.SetStateAction<BatchProgress | null>>;
  batchSelectedIds: number[];
}

export function useBatchProcessing({
  batchSelection,
  localAnswers,
}: UseBatchProcessingOptions): UseBatchProcessingReturn {
  // Batch progress state
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);

  // Batch processor instance (stable across renders)
  const [batchProcessor] = useState(() =>
    BatchAIProcessor.create({
      concurrency: 8, // 8 parallel AI requests
      maxRetries: 3,
      onProgress: progress => setBatchProgress(progress),
      onComplete: progress => {
        toast.success(
          `Batch completed: ${progress.succeeded} succeeded, ${progress.failed} failed`
        );
      },
      onError: error => {
        toast.error(`Batch error: ${error.message}`);
      },
    })
  );

  // Compute ordered answer IDs for batch selection
  const orderedAnswerIds = useMemo(
    () => localAnswers.map(answer => String(answer.id)),
    [localAnswers]
  );

  // Sync batch selection IDs when local answers change
  useEffect(() => {
    batchSelection.setIds(orderedAnswerIds);
  }, [batchSelection, orderedAnswerIds]);

  // Convert selected IDs to numbers for API calls
  const batchSelectedIds = useMemo(
    () =>
      Array.from(batchSelection.selectedIds)
        .map(id => parseInt(id, 10))
        .filter(id => !Number.isNaN(id)),
    [batchSelection.selectedIds]
  );

  return {
    batchProcessor,
    batchProgress,
    setBatchProgress,
    batchSelectedIds,
  };
}
