import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, Analysis } from '@/types/api';

export function useAnalyses() {
  return useQuery({
    queryKey: ['analyses'],
    queryFn: () => api.get<ApiResponse<Analysis[]>>('/analyses'),
    select: (res) => res.data,
  });
}
