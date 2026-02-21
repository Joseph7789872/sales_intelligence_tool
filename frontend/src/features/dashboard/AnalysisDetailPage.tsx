import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { useAnalysisDetail } from './hooks/useAnalysisDetail';
import { AnalysisStatusBadge } from './components/AnalysisStatusBadge';
import { PatternsSummary } from './components/PatternsSummary';
import { ProspectCard } from './components/ProspectCard';
import type { Playbook } from '@/types/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const stepLabels: Record<string, string> = {
  patterns: 'Analyzing deal patterns...',
  lookalikes: 'Searching for lookalike prospects...',
  playbooks: 'Generating sales playbooks...',
};

export function AnalysisDetailPage() {
  const { analysisId } = useParams<{ analysisId: string }>();
  const { data: analysis, isLoading, error } = useAnalysisDetail(analysisId!);
  const [expandedProspectId, setExpandedProspectId] = useState<string | null>(
    null,
  );

  // Build playbook lookup by prospectId
  const playbookMap = new Map<string, Playbook>();
  if (analysis?.playbooks) {
    for (const pb of analysis.playbooks) {
      playbookMap.set(pb.prospectId, pb);
    }
  }

  return (
    <div className="min-h-screen bg-surface px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Back link */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Dashboard
        </Link>

        {/* Loading */}
        {isLoading && (
          <div className="mt-16 flex justify-center">
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
        )}

        {/* Error */}
        {error && (
          <div className="mt-8 rounded-lg border border-error/30 bg-error/10 p-4 text-sm text-error">
            Failed to load analysis: {error.message}
          </div>
        )}

        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6"
          >
            {/* Header */}
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                Analysis Results
              </h1>
              <AnalysisStatusBadge status={analysis.status} />
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              {analysis.dealCount} deals analyzed
              {analysis.prospects.length > 0 &&
                ` \u00B7 ${analysis.prospects.length} prospects found`}
              {analysis.playbooks.length > 0 &&
                ` \u00B7 ${analysis.playbooks.length} playbooks generated`}
            </p>

            {/* Processing state */}
            {(analysis.status === 'pending' ||
              analysis.status === 'processing') && (
              <Card padding="lg" className="mt-8">
                <div className="flex flex-col items-center text-center">
                  <svg
                    className="h-10 w-10 animate-spin text-accent"
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
                  <p className="mt-4 text-sm font-medium text-text-primary">
                    {analysis.status === 'pending'
                      ? 'Waiting to start...'
                      : stepLabels[analysis.errorStep ?? 'patterns'] ??
                        'Processing...'}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    This usually takes 1-2 minutes. The page will update
                    automatically.
                  </p>

                  {/* Progress bar */}
                  <div className="mt-4 h-1.5 w-64 overflow-hidden rounded-full bg-surface-200">
                    <div className="h-full animate-pulse-slow rounded-full bg-accent" style={{ width: '60%' }} />
                  </div>
                </div>
              </Card>
            )}

            {/* Failed state */}
            {analysis.status === 'failed' && (
              <Card padding="md" className="mt-8 border-error/30">
                <p className="text-sm font-medium text-error">
                  Analysis failed
                  {analysis.errorStep && ` at step: ${analysis.errorStep}`}
                </p>
                {analysis.errorMessage && (
                  <p className="mt-1 text-sm text-text-secondary">
                    {analysis.errorMessage}
                  </p>
                )}
              </Card>
            )}

            {/* Completed state */}
            {analysis.status === 'completed' && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="mt-8 space-y-8"
              >
                {/* Patterns */}
                {analysis.patterns && (
                  <motion.div variants={itemVariants}>
                    <PatternsSummary patterns={analysis.patterns} />
                  </motion.div>
                )}

                {/* Prospects + Playbooks */}
                {analysis.prospects.length > 0 && (
                  <motion.div variants={itemVariants}>
                    <h2 className="mb-4 text-lg font-semibold text-text-primary">
                      Lookalike Prospects
                    </h2>
                    <div className="space-y-4">
                      {analysis.prospects.map((prospect) => (
                        <ProspectCard
                          key={prospect.id}
                          prospect={prospect}
                          playbook={playbookMap.get(prospect.id)}
                          isExpanded={expandedProspectId === prospect.id}
                          onToggle={() =>
                            setExpandedProspectId(
                              expandedProspectId === prospect.id
                                ? null
                                : prospect.id,
                            )
                          }
                          analysisId={analysis.id}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
