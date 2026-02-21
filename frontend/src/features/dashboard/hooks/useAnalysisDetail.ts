import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, AnalysisWithResults } from '@/types/api';

export function useAnalysisDetail(analysisId: string) {
  return useQuery({
    queryKey: ['analyses', analysisId],
    queryFn: () =>
      api.get<ApiResponse<AnalysisWithResults>>(`/analyses/${analysisId}`),
    select: (res) => res.data,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      return status === 'pending' || status === 'processing' ? 5000 : false;
    },
  });
}
