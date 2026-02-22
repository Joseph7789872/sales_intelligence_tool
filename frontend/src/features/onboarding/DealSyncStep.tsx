import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import type { ApiResponse, CrmConnection, PaginatedDeals, SyncJob, Deal } from '@/types/api';

interface DealSyncStepProps {
  onComplete: (selectedDealIds: string[]) => void;
  onBack: () => void;
}

const MIN_DEALS = 10;

type SyncState = 'ready' | 'syncing' | 'selecting';

export function DealSyncStep({ onComplete, onBack }: DealSyncStepProps) {
  const [syncState, setSyncState] = useState<SyncState>('ready');
  const [jobId, setJobId] = useState<string | null>(null);
  const [selectedDealIds, setSelectedDealIds] = useState<Set<string>>(new Set());

  // Get CRM connection for sync
  const { data: connections } = useQuery({
    queryKey: ['crm', 'connections'],
    queryFn: () => api.get<ApiResponse<CrmConnection[]>>('/crm/connections'),
    select: (res) => res.data,
  });

  const activeConnection = connections?.find(
    (c) => c.provider === 'salesforce' && c.status === 'active',
  );

  const isDemoConnection = activeConnection?.instanceUrl === 'https://demo.salesforce.com';

  // Poll sync job status (only for real sync)
  const { data: syncStatus } = useQuery({
    queryKey: ['deals', 'sync', jobId],
    queryFn: () => api.get<ApiResponse<SyncJob>>(`/deals/sync/${jobId}`),
    select: (res) => res.data,
    enabled: syncState === 'syncing' && !!jobId && !isDemoConnection,
    refetchInterval: 2000,
  });

  // Transition to selecting when sync completes
  if (syncStatus?.status === 'completed' && syncState === 'syncing') {
    setSyncState('selecting');
  }

  // Fetch deals for selection
  const { data: dealsData } = useQuery({
    queryKey: ['deals', 'list'],
    queryFn: () =>
      api.get<ApiResponse<PaginatedDeals>>(
        `/deals?limit=200&sortBy=amount&sortOrder=desc`,
      ),
    select: (res) => res.data,
    enabled: syncState === 'selecting',
  });

  const deals = dealsData?.deals ?? [];

  // Mock sync mutation (demo mode)
  const mockSync = useMutation({
    mutationFn: () =>
      api.post<ApiResponse<{ synced: number }>>('/deals/mock-sync', {
        connectionId: activeConnection!.id,
      }),
    onSuccess: () => {
      setSyncState('selecting');
    },
  });

  // Real sync mutation
  const startSync = useMutation({
    mutationFn: () =>
      api.post<ApiResponse<{ jobId: string }>>('/deals/sync', {
        connectionId: activeConnection!.id,
      }),
    onSuccess: (res) => {
      setJobId(res.data.jobId);
      setSyncState('syncing');
    },
  });

  const handleStartSync = () => {
    if (isDemoConnection) {
      mockSync.mutate();
    } else {
      startSync.mutate();
    }
  };

  const isSyncPending = startSync.isPending || mockSync.isPending;
  const isSyncError = startSync.isError || mockSync.isError;

  const toggleDeal = (dealId: string) => {
    setSelectedDealIds((prev) => {
      const next = new Set(prev);
      if (next.has(dealId)) {
        next.delete(dealId);
      } else {
        next.add(dealId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedDealIds.size === deals.length) {
      setSelectedDealIds(new Set());
    } else {
      setSelectedDealIds(new Set(deals.map((d) => d.id)));
    }
  };

  const selectedCount = selectedDealIds.size;
  const hasEnough = selectedCount >= MIN_DEALS;

  const formatAmount = (amount: string | null, currency: string | null) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  const progress = syncStatus?.progress ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card padding="lg">
        {/* Sub-state: Ready to Sync */}
        {syncState === 'ready' && (
          <>
            <h2 className="text-2xl font-bold text-text-primary">
              {isDemoConnection ? 'Load Demo Deals' : 'Sync Your Deals'}
            </h2>
            <p className="mt-2 text-text-secondary">
              {isDemoConnection
                ? 'We\'ll load 15 sample closed-won deals for analysis.'
                : 'We\'ll pull your closed-won deals from Salesforce for analysis.'}
            </p>
            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                onClick={handleStartSync}
                isLoading={isSyncPending}
                disabled={!activeConnection}
              >
                {isDemoConnection ? 'Load Demo Deals' : 'Start Sync'}
              </Button>
            </div>
            {isSyncError && (
              <p className="mt-4 text-center text-sm text-error">
                Failed to {isDemoConnection ? 'load demo deals' : 'start sync'}. Please try again.
              </p>
            )}
            <div className="mt-8 flex justify-start">
              <Button variant="ghost" onClick={onBack}>
                Back
              </Button>
            </div>
          </>
        )}

        {/* Sub-state: Syncing */}
        {syncState === 'syncing' && (
          <>
            <h2 className="text-2xl font-bold text-text-primary">
              Syncing Deals...
            </h2>
            <p className="mt-2 text-text-secondary">
              Pulling closed-won deals from your CRM.
            </p>
            <div className="mt-8">
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-200">
                <div
                  className="h-2 rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-center text-sm text-text-muted">
                {progress}% complete
              </p>
            </div>
            {syncStatus?.status === 'failed' && (
              <div className="mt-4 text-center">
                <p className="text-sm text-error">
                  Sync failed: {syncStatus.failedReason || 'Unknown error'}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setSyncState('ready');
                    setJobId(null);
                  }}
                >
                  Try Again
                </Button>
              </div>
            )}
          </>
        )}

        {/* Sub-state: Deal Selection */}
        {syncState === 'selecting' && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-text-primary">
                  Select Deals to Analyze
                </h2>
                <p className="mt-1 text-text-secondary">
                  Choose at least {MIN_DEALS} closed-won deals for pattern analysis.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selectedDealIds.size === deals.length
                  ? 'Deselect All'
                  : 'Select All'}
              </Button>
            </div>

            <div className="mt-6 max-h-96 space-y-2 overflow-y-auto pr-1">
              {deals.map((deal) => (
                <label
                  key={deal.id}
                  className={`
                    flex cursor-pointer items-center gap-3 rounded-lg border p-3
                    transition-colors
                    ${
                      selectedDealIds.has(deal.id)
                        ? 'border-accent/50 bg-accent/5'
                        : 'border-border bg-surface-100 hover:border-border-hover'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedDealIds.has(deal.id)}
                    onChange={() => toggleDeal(deal.id)}
                    className="h-4 w-4 rounded border-border bg-surface-50 text-accent focus:ring-accent/30"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-text-primary">
                      {deal.name}
                    </p>
                    <p className="text-sm text-text-muted">
                      {deal.companyName || 'Unknown'}
                      {deal.industry && (
                        <span className="ml-2 rounded bg-surface-200 px-1.5 py-0.5 text-xs">
                          {deal.industry}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm text-text-primary">
                      {formatAmount(deal.amount, deal.currency)}
                    </p>
                    {deal.closeDate && (
                      <p className="text-xs text-text-muted">
                        {new Date(deal.closeDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </label>
              ))}

              {deals.length === 0 && (
                <p className="py-8 text-center text-text-muted">
                  No deals found. Make sure your CRM has closed-won deals.
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={onBack}>
                  Back
                </Button>
                <span
                  className={`text-sm ${
                    hasEnough ? 'text-text-secondary' : 'text-error'
                  }`}
                >
                  {selectedCount} of {deals.length} deals selected
                  {!hasEnough && selectedCount > 0 && ` (need at least ${MIN_DEALS})`}
                </span>
              </div>
              <Button
                onClick={() => onComplete(Array.from(selectedDealIds))}
                disabled={!hasEnough}
              >
                Complete Setup
              </Button>
            </div>
          </>
        )}
      </Card>
    </motion.div>
  );
}
