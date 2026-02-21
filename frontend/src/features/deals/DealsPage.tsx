import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { DealFlowTimeline } from './DealFlowTimeline';
import { useDealHistory } from './hooks/useDealHistory';
import type { ApiResponse, PaginatedDeals } from '@/types/api';

type SortBy = 'closeDate' | 'amount' | 'companyName';
type SortOrder = 'asc' | 'desc';

export function DealsPage() {
  const [sortBy, setSortBy] = useState<SortBy>('closeDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedDealId, setExpandedDealId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['deals', sortBy, sortOrder],
    queryFn: () =>
      api.get<ApiResponse<PaginatedDeals>>(
        `/deals?sortBy=${sortBy}&sortOrder=${sortOrder}&limit=100`,
      ),
    select: (res) => res.data,
  });

  const { data: historyData, isLoading: isHistoryLoading } =
    useDealHistory(expandedDealId);

  const toggleExpand = (dealId: string) => {
    setExpandedDealId((prev) => (prev === dealId ? null : dealId));
  };

  const toggleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <svg
          className="h-8 w-8 animate-spin text-accent"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    );
  }

  const deals = data?.deals ?? [];

  return (
    <div className="min-h-screen bg-surface px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text-primary">Deals</h1>
            <p className="mt-1 text-sm text-text-muted">
              {data?.total ?? 0} synced deals — click a deal to view its
              stage timeline
            </p>
          </div>

          <Card padding="sm" className="overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-4 border-b border-border px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-muted">
              <SortHeader
                label="Deal Name"
                column="companyName"
                current={sortBy}
                order={sortOrder}
                onToggle={toggleSort}
              />
              <span>Company</span>
              <SortHeader
                label="Amount"
                column="amount"
                current={sortBy}
                order={sortOrder}
                onToggle={toggleSort}
              />
              <SortHeader
                label="Close Date"
                column="closeDate"
                current={sortBy}
                order={sortOrder}
                onToggle={toggleSort}
              />
              <span>Industry</span>
            </div>

            {/* Deal rows */}
            {deals.map((deal) => (
              <div key={deal.id}>
                <button
                  onClick={() => toggleExpand(deal.id)}
                  className={`
                    grid w-full grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-4
                    px-4 py-3 text-left text-sm transition-colors
                    hover:bg-surface-100
                    ${expandedDealId === deal.id ? 'bg-surface-100' : ''}
                  `}
                >
                  <span className="truncate font-medium text-text-primary">
                    {deal.name}
                  </span>
                  <span className="truncate text-text-secondary">
                    {deal.companyName ?? '\u2014'}
                  </span>
                  <span className="text-text-secondary">
                    {deal.amount
                      ? new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: deal.currency || 'USD',
                          maximumFractionDigits: 0,
                        }).format(Number(deal.amount))
                      : '\u2014'}
                  </span>
                  <span className="text-text-secondary">
                    {deal.closeDate
                      ? new Date(deal.closeDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '\u2014'}
                  </span>
                  <span className="truncate text-text-secondary">
                    {deal.industry ?? '\u2014'}
                  </span>
                </button>

                {/* Expandable timeline */}
                <AnimatePresence>
                  {expandedDealId === deal.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden border-t border-border bg-surface-50"
                    >
                      <div className="px-6 py-4">
                        {isHistoryLoading ? (
                          <div className="flex items-center gap-2 py-4">
                            <svg
                              className="h-4 w-4 animate-spin text-accent"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                            <span className="text-sm text-text-muted">
                              Loading timeline...
                            </span>
                          </div>
                        ) : historyData?.stageHistory.length ? (
                          <DealFlowTimeline
                            stageHistory={historyData.stageHistory}
                          />
                        ) : (
                          <p className="py-4 text-sm text-text-muted">
                            No stage history available for this deal.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            {deals.length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-text-muted">
                No deals synced yet. Connect your CRM and sync deals first.
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

// ── Sort Header helper ──────────────────────

interface SortHeaderProps {
  label: string;
  column: SortBy;
  current: SortBy;
  order: SortOrder;
  onToggle: (column: SortBy) => void;
}

function SortHeader({
  label,
  column,
  current,
  order,
  onToggle,
}: SortHeaderProps) {
  const isActive = current === column;
  return (
    <button
      onClick={() => onToggle(column)}
      className="flex items-center gap-1 hover:text-text-secondary"
    >
      {label}
      {isActive && (
        <span className="text-accent">
          {order === 'asc' ? '\u2191' : '\u2193'}
        </span>
      )}
    </button>
  );
}
