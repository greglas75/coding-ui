import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { CostPrediction } from '@/types/cost-dashboard';

const API_BASE_URL = 'http://localhost:3001';

export function useCostPredictions() {
  return useQuery<CostPrediction>({
    queryKey: ['cost-dashboard', 'predictions'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE_URL}/api/v1/cost-dashboard/predictions`);
      return data;
    },
    staleTime: 10 * 60 * 1000, // Predictions don't change often
  });
}
