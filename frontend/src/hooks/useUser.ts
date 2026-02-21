import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, User } from '@/types/api';

export function useUser() {
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.get<ApiResponse<User>>('/users/me'),
    select: (res) => res.data,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { companyName?: string; fullName?: string }) =>
      api.patch<ApiResponse<User>>('/users/me', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });
}

export function useUpdateOnboardingStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (step: number) =>
      api.patch<ApiResponse<User>>('/users/me/onboarding-step', { step }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });
}
