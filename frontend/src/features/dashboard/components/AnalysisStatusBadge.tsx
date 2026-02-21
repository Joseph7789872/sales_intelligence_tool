import type { AnalysisStatus } from '@/types/api';

interface AnalysisStatusBadgeProps {
  status: AnalysisStatus;
}

const statusConfig: Record<AnalysisStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-surface-200 text-text-muted',
  },
  processing: {
    label: 'Processing',
    className: 'bg-accent/20 text-accent animate-pulse-slow',
  },
  completed: {
    label: 'Completed',
    className: 'bg-success/20 text-success',
  },
  failed: {
    label: 'Failed',
    className: 'bg-error/20 text-error',
  },
};

export function AnalysisStatusBadge({ status }: AnalysisStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
