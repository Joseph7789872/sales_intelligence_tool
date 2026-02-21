import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import type { Patterns } from '@/types/api';

interface PatternsSummaryProps {
  patterns: Patterns;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

function PatternList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <Card padding="sm">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-text-secondary">
            <span className="mt-0.5 text-accent">&#8226;</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function PatternsSummary({ patterns }: PatternsSummaryProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <h2 className="mb-4 text-lg font-semibold text-text-primary">
        Deal Patterns
      </h2>

      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <PatternList title="Pain Points" items={patterns.painPoints} />
        <PatternList title="Winning Subjects" items={patterns.winningSubjects} />
        <PatternList title="Common Objections" items={patterns.commonObjections} />
        <PatternList title="Champion Roles" items={patterns.championRoles} />
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="mt-4 flex flex-wrap gap-6 text-sm text-text-secondary"
      >
        {patterns.avgSalesCycleDays && (
          <div>
            Avg Sales Cycle:{' '}
            <span className="font-medium text-text-primary">
              {patterns.avgSalesCycleDays} days
            </span>
          </div>
        )}
        {patterns.dealSizeRange && (
          <div>
            Deal Size:{' '}
            <span className="font-medium text-text-primary">
              ${patterns.dealSizeRange.min.toLocaleString()} &ndash; $
              {patterns.dealSizeRange.max.toLocaleString()}
            </span>
            <span className="text-text-muted">
              {' '}(avg ${patterns.dealSizeRange.avg.toLocaleString()})
            </span>
          </div>
        )}
        {patterns.industryBreakdown && (
          <div>
            Top Industries:{' '}
            <span className="font-medium text-text-primary">
              {Object.entries(patterns.industryBreakdown)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([ind, count]) => `${ind} (${count})`)
                .join(', ')}
            </span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
