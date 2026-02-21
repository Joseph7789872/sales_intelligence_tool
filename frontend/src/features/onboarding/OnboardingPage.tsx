import { Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { useOnboarding } from './hooks/useOnboarding';
import { WelcomeStep } from './WelcomeStep';
import { CRMStep } from './CRMStep';
import { EnrichmentStep } from './EnrichmentStep';
import { DealSyncStep } from './DealSyncStep';

const STEPS = [
  { label: 'Welcome' },
  { label: 'CRM' },
  { label: 'Enrichment' },
  { label: 'Deals' },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
  }),
};

export function OnboardingPage() {
  const {
    currentStep,
    direction,
    goToNext,
    goToPrevious,
    completeOnboarding,
    isLoading,
    user,
  } = useOnboarding();

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

  if (user && user.onboardingStep >= 4) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-2xl">
        <StepIndicator steps={STEPS} currentStep={currentStep} />

        <div className="relative mt-10 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {currentStep === 0 && (
                <WelcomeStep
                  onComplete={goToNext}
                  initialCompanyName={user?.companyName ?? ''}
                />
              )}
              {currentStep === 1 && (
                <CRMStep onComplete={goToNext} onBack={goToPrevious} />
              )}
              {currentStep === 2 && (
                <EnrichmentStep onComplete={goToNext} onBack={goToPrevious} />
              )}
              {currentStep === 3 && (
                <DealSyncStep
                  onComplete={async () => {
                    await completeOnboarding();
                  }}
                  onBack={goToPrevious}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
