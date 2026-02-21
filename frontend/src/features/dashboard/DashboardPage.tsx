import { motion } from 'framer-motion';
import { useAnalyses } from './hooks/useAnalyses';
import { AnalysisCard } from './components/AnalysisCard';
import { EmptyDashboard } from './components/EmptyDashboard';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export function DashboardPage() {
  const { data: analyses, isLoading, error } = useAnalyses();

  return (
    <div className="min-h-screen bg-surface px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Your AI-generated sales playbooks
          </p>
        </motion.div>

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
            Failed to load analyses: {error.message}
          </div>
        )}

        {/* Empty state */}
        {analyses && analyses.length === 0 && (
          <div className="mt-16">
            <EmptyDashboard />
          </div>
        )}

        {/* Analysis list */}
        {analyses && analyses.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-8 space-y-4"
          >
            {analyses.map((analysis) => (
              <motion.div key={analysis.id} variants={itemVariants}>
                <AnalysisCard analysis={analysis} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
