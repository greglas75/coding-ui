import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { DetailedCosts } from '@/types/cost-dashboard';

const API_BASE_URL = 'http://localhost:3001';

interface DetailedParams {
  feature_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
  sort?: string;
}

export function useCostDetailed(params: DetailedParams = {}) {
  return useQuery<DetailedCosts>({
    queryKey: ['cost-dashboard', 'detailed', params],
    queryFn: async () => {
      const { data} = await axios.get(`${API_BASE_URL}/api/v1/cost-dashboard/detailed`, {
        params
      });
      return data;
    },
    keepPreviousData: true, // For smooth pagination
  });
}
