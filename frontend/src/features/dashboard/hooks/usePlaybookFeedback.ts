import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, Playbook } from '@/types/api';

export function usePlaybookFeedback(analysisId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      playbookId,
      feedback,
    }: {
      playbookId: string;
      feedback: 'thumbs_up' | 'thumbs_down';
    }) =>
      api.patch<ApiResponse<Playbook>>(
        `/analyses/${analysisId}/playbooks/${playbookId}/feedback`,
        { feedback },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyses', analysisId] });
    },
  });
}
