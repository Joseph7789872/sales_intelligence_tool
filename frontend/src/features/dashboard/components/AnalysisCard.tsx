import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { AnalysisStatusBadge } from './AnalysisStatusBadge';
import type { Analysis } from '@/types/api';

interface AnalysisCardProps {
  analysis: Analysis;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function AnalysisCard({ analysis }: AnalysisCardProps) {
  return (
    <Link to={`/dashboard/${analysis.id}`}>
      <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.15 }}>
        <Card
          padding="md"
          className="cursor-pointer transition-colors hover:border-border-hover"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-text-primary">
                  Analysis
                </h3>
                <AnalysisStatusBadge status={analysis.status} />
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                {analysis.dealCount} deals analyzed
              </p>
            </div>
            <div className="text-right text-xs text-text-muted">
              <div>{formatDate(analysis.createdAt)}</div>
              {analysis.completedAt && (
                <div className="mt-0.5 text-success">
                  Completed {formatDate(analysis.completedAt)}
                </div>
              )}
            </div>
          </div>

          {analysis.status === 'failed' && analysis.errorMessage && (
            <p className="mt-2 text-xs text-error">
              Failed at {analysis.errorStep}: {analysis.errorMessage}
            </p>
          )}
        </Card>
      </motion.div>
    </Link>
  );
}
