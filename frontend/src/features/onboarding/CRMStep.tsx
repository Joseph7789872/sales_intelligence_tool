import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import type { ApiResponse, CrmConnection } from '@/types/api';

interface CRMStepProps {
  onComplete: () => void;
  onBack: () => void;
}

const CRM_PROVIDERS = [
  { id: 'salesforce', name: 'Salesforce', available: true },
  { id: 'hubspot', name: 'HubSpot', available: false },
  { id: 'pipedrive', name: 'Pipedrive', available: false },
  { id: 'attio', name: 'Attio', available: false },
  { id: 'close', name: 'Close', available: false },
];

export function CRMStep({ onComplete, onBack }: CRMStepProps) {
  const [searchParams] = useSearchParams();
  const justConnected = searchParams.get('connected') === 'salesforce';

  const { data: connections, isLoading } = useQuery({
    queryKey: ['crm', 'connections'],
    queryFn: () => api.get<ApiResponse<CrmConnection[]>>('/crm/connections'),
    select: (res) => res.data,
    refetchInterval: justConnected ? false : 5000, // Poll until connected
  });

  const salesforceConnection = connections?.find(
    (c) => c.provider === 'salesforce' && c.status === 'active',
  );
  const isConnected = !!salesforceConnection || justConnected;

  // Stop polling once connected
  useEffect(() => {
    if (salesforceConnection) {
      // Connection detected
    }
  }, [salesforceConnection]);

  const handleConnect = () => {
    window.location.href = '/api/v1/crm/salesforce/authorize?context=onboarding';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card padding="lg">
        <h2 className="text-2xl font-bold text-text-primary">
          Connect Your CRM
        </h2>
        <p className="mt-2 text-text-secondary">
          Link your CRM to pull closed-won deals for analysis.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4">
          {CRM_PROVIDERS.map((provider) => (
            <div
              key={provider.id}
              className={`
                relative rounded-lg border p-4 transition-all
                ${
                  provider.available
                    ? isConnected
                      ? 'border-success bg-success/5'
                      : 'border-border hover:border-border-hover bg-surface-100'
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
                  {isConnected ? (
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
                      <span className="text-sm text-success">Connected</span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleConnect}
                      isLoading={isLoading}
                    >
                      Connect {provider.name}
                    </Button>
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
          <Button onClick={onComplete} disabled={!isConnected}>
            Continue
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
