import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, DealWithHistory } from '@/types/api';

export function useDealHistory(dealId: string | null) {
  return useQuery({
    queryKey: ['deals', dealId, 'history'],
    queryFn: () =>
      api.get<ApiResponse<DealWithHistory>>(`/deals/${dealId}`),
    select: (res) => res.data,
    enabled: !!dealId,
  });
}
