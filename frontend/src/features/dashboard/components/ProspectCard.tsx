import { AnimatePresence, motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { PlaybookDetail } from './PlaybookDetail';
import type { Prospect, Playbook } from '@/types/api';

interface ProspectCardProps {
  prospect: Prospect;
  playbook: Playbook | undefined;
  isExpanded: boolean;
  onToggle: () => void;
  analysisId: string;
}

function getScoreColor(score: number): string {
  if (score >= 71) return 'bg-success';
  if (score >= 41) return 'bg-warning';
  return 'bg-error';
}

export function ProspectCard({
  prospect,
  playbook,
  isExpanded,
  onToggle,
  analysisId,
}: ProspectCardProps) {
  return (
    <Card padding="md">
      {/* Clickable header */}
      <button
        onClick={onToggle}
        className="flex w-full items-start justify-between text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-text-primary">
              {prospect.companyName}
            </h3>
            {prospect.matchScore !== null && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-200">
                  <div
                    className={`h-full rounded-full ${getScoreColor(prospect.matchScore)}`}
                    style={{ width: `${prospect.matchScore}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-text-muted">
                  {prospect.matchScore}%
                </span>
              </div>
            )}
          </div>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-text-secondary">
            {prospect.industry && <span>{prospect.industry}</span>}
            {prospect.employeeCount && (
              <span>{prospect.employeeCount.toLocaleString()} employees</span>
            )}
            {prospect.revenue && <span>{prospect.revenue}</span>}
            {prospect.location && <span>{prospect.location}</span>}
          </div>

          {/* Contact info */}
          <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-text-muted">
            {prospect.contactName && (
              <span>
                {prospect.contactName}
                {prospect.contactTitle && ` (${prospect.contactTitle})`}
              </span>
            )}
            {prospect.contactEmail && (
              <a
                href={`mailto:${prospect.contactEmail}`}
                onClick={(e) => e.stopPropagation()}
                className="text-accent hover:underline"
              >
                {prospect.contactEmail}
              </a>
            )}
            {prospect.contactLinkedin && (
              <a
                href={prospect.contactLinkedin}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-accent hover:underline"
              >
                LinkedIn
              </a>
            )}
          </div>

          {/* Match reasons */}
          {prospect.matchReasons && prospect.matchReasons.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {prospect.matchReasons.map((reason, i) => (
                <span
                  key={i}
                  className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent"
                >
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Chevron */}
        <svg
          className={`ml-4 mt-1 h-5 w-5 shrink-0 text-text-muted transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Expandable playbook */}
      <AnimatePresence>
        {isExpanded && playbook && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <PlaybookDetail playbook={playbook} analysisId={analysisId} />
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
