import { motion } from 'framer-motion';
import type { StageHistoryEntry } from '@/types/api';

interface DealFlowTimelineProps {
  stageHistory: StageHistoryEntry[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DealFlowTimeline({ stageHistory }: DealFlowTimelineProps) {
  const totalDays = stageHistory.reduce(
    (sum, s) => sum + (s.durationDays ?? 0),
    0,
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative py-4 pl-8"
    >
      {/* Vertical line */}
      <div className="absolute bottom-4 left-[15px] top-4 w-0.5 bg-border" />

      {stageHistory.map((stage, index) => {
        const isLast = index === stageHistory.length - 1;
        const isCompleted = !isLast;

        return (
          <motion.div
            key={stage.id}
            variants={itemVariants}
            className="relative mb-6 last:mb-0"
          >
            {/* Circle indicator */}
            <div
              className={`
                absolute -left-8 top-0.5 flex h-3.5 w-3.5 items-center
                justify-center rounded-full
                ${
                  isCompleted
                    ? 'bg-success'
                    : 'border-2 border-accent bg-surface'
                }
              `}
            >
              {isCompleted && (
                <svg
                  className="h-2 w-2 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>

            {/* Stage content */}
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {stage.stageName}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                {stage.durationDays != null
                  ? `${stage.durationDays} day${stage.durationDays !== 1 ? 's' : ''}`
                  : 'Final stage'}
              </p>
              <p className="text-xs text-text-muted">
                {formatDate(stage.enteredAt)}
                {stage.exitedAt ? ` \u2014 ${formatDate(stage.exitedAt)}` : ''}
              </p>
            </div>
          </motion.div>
        );
      })}

      {/* Total duration footer */}
      {totalDays > 0 && (
        <motion.div
          variants={itemVariants}
          className="mt-4 border-t border-border pt-3 text-xs text-text-secondary"
        >
          Total deal duration:{' '}
          <span className="font-medium text-text-primary">
            {totalDays} days
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
