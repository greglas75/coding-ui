/**
 * Hook for polling codeframe generation status
 */
import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { StatusResponse } from '@/types/codeframe';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface PollingOptions {
  interval?: number; // milliseconds
  onComplete?: (status: StatusResponse) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

export function useCodeframePolling(
  generationId: string | null,
  options: PollingOptions = {}
) {
  const {
    interval = 2000,
    onComplete,
    onError,
    enabled = true,
  } = options;

  const [isComplete, setIsComplete] = useState(false);

  const { data: status, error } = useQuery({
    queryKey: ['codeframe-status', generationId],
    queryFn: async () => {
      if (!generationId) return null;

      const response = await axios.get<StatusResponse>(
        `${API_BASE}/api/v1/codeframe/${generationId}/status`
      );
      return response.data;
    },
    enabled: enabled && !!generationId && !isComplete,
    refetchInterval: (query) => {
      const status = query.state.data;
      if (!status) return interval;

      // Stop polling if completed or failed
      if (status.status === 'completed' || status.status === 'failed') {
        return false;
      }

      return interval;
    },
    retry: 3,
  });

  // Trigger onComplete callback when status changes to completed or failed
  useEffect(() => {
    if (status && (status.status === 'completed' || status.status === 'failed')) {
      if (!isComplete) {
        setIsComplete(true);
        // Call onComplete for both completed and failed statuses
        // UI can check status.status to handle differently
        if (onComplete) {
          onComplete(status);
        }
      }
    }
  }, [status, onComplete, isComplete]);

  // Trigger onError callback
  useEffect(() => {
    if (error && onError) {
      onError(error as Error);
    }
  }, [error, onError]);

  return {
    status,
    progress: status?.progress || 0,
    isComplete,
    isError: !!error,
    error,
  };
}
