import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { CostOverview } from '@/types/cost-dashboard';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3020';

export function useCostOverview(period: string = 'this_month') {
  return useQuery<CostOverview>({
    queryKey: ['cost-dashboard', 'overview', period],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE_URL}/api/v1/cost-dashboard/overview`, {
        params: { period }
      });
      return data;
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000,       // Consider stale after 2 minutes
  });
}
