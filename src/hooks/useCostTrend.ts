import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { CostTrend } from '@/types/cost-dashboard';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3020';

export function useCostTrend(period: 'daily' | 'monthly' = 'monthly', params?: Record<string, any>) {
  return useQuery<CostTrend>({
    queryKey: ['cost-dashboard', 'trend', period, params],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE_URL}/api/v1/cost-dashboard/trend`, {
        params: { period, ...params }
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
