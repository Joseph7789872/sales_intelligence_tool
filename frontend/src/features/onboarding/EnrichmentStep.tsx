import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import type { ApiResponse, EnrichmentConfig } from '@/types/api';

interface EnrichmentStepProps {
  onComplete: () => void;
  onBack: () => void;
}

const ENRICHMENT_PROVIDERS = [
  { id: 'clay', name: 'Clay', available: true },
  { id: 'zoominfo', name: 'ZoomInfo', available: false },
  { id: 'apollo', name: 'Apollo', available: false },
  { id: 'fullenrich', name: 'FullEnrich', available: false },
  { id: 'clearbit', name: 'Clearbit', available: false },
];

export function EnrichmentStep({ onComplete, onBack }: EnrichmentStepProps) {
  const [apiKey, setApiKey] = useState('');
  const [validationError, setValidationError] = useState('');
  const queryClient = useQueryClient();

  const { data: configs } = useQuery({
    queryKey: ['enrichment', 'configs'],
    queryFn: () => api.get<ApiResponse<EnrichmentConfig[]>>('/enrichment/configs'),
    select: (res) => res.data,
  });

  const clayConfig = configs?.find((c) => c.provider === 'clay');
  const isValidated = clayConfig?.isValid === true;

  const saveConfig = useMutation({
    mutationFn: (data: { provider: string; apiKey: string }) =>
      api.post<ApiResponse<EnrichmentConfig>>('/enrichment/configs', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['enrichment', 'configs'] });
      if (!res.data.isValid) {
        setValidationError('Invalid API key. Please check and try again.');
      } else {
        setValidationError('');
      }
    },
    onError: () => {
      setValidationError('Failed to validate API key. Please try again.');
    },
  });

  const handleValidate = async () => {
    if (!apiKey.trim()) return;
    setValidationError('');
    await saveConfig.mutateAsync({ provider: 'clay', apiKey: apiKey.trim() });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card padding="lg">
        <h2 className="text-2xl font-bold text-text-primary">
          Set Up Enrichment
        </h2>
        <p className="mt-2 text-text-secondary">
          Connect an enrichment tool to find lookalike prospects from your winning deals.
        </p>

        <div className="mt-8 space-y-4">
          {ENRICHMENT_PROVIDERS.map((provider) => (
            <div
              key={provider.id}
              className={`
                relative rounded-lg border p-4 transition-all
                ${
                  provider.available
                    ? isValidated
                      ? 'border-success bg-success/5'
                      : 'border-border bg-surface-100'
                    : 'border-border bg-surface-100 opacity-50'
                }
              `}
            >
              {!provider.available && (
                <span className="absolute right-2 top-2 rounded-full bg-surface-200 px-2 py-0.5 text-xs text-text-muted">
                  Coming Soon
                </span>
              )}

              <h3 className="font-semibold text-text-primary">
                {provider.name}
              </h3>

              {provider.available && (
                <div className="mt-3">
                  {isValidated ? (
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-5 w-5 text-success"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-sm text-success">
                        API key validated
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <Input
                          type="password"
                          placeholder="Enter your Clay API key"
                          value={apiKey}
                          onChange={(e) => {
                            setApiKey(e.target.value);
                            setValidationError('');
                          }}
                          error={validationError}
                        />
                      </div>
                      <Button
                        size="md"
                        onClick={handleValidate}
                        isLoading={saveConfig.isPending}
                        disabled={!apiKey.trim()}
                        className={validationError ? 'mb-5' : ''}
                      >
                        Validate & Save
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-between">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onComplete} disabled={!isValidated}>
            Continue
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
