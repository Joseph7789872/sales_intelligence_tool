import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUser, useUpdateOnboardingStep } from '@/hooks/useUser';

export function useOnboarding() {
  const { data: user, isLoading: userLoading } = useUser();
  const updateStep = useUpdateOnboardingStep();
  const [searchParams, setSearchParams] = useSearchParams();

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Initialize step from user's saved progress
  useEffect(() => {
    if (user) {
      // If returning from CRM OAuth, stay on CRM step (step 1)
      const connected = searchParams.get('connected');
      if (connected) {
        setCurrentStep(1);
        // Clean up the URL param
        setSearchParams({}, { replace: true });
      } else {
        setCurrentStep(user.onboardingStep);
      }
    }
  }, [user?.id]); // Only run when user loads, not on every re-render

  const goToNext = useCallback(async () => {
    const nextStep = currentStep + 1;
    setDirection(1);
    setCurrentStep(nextStep);
    await updateStep.mutateAsync(nextStep);
  }, [currentStep, updateStep]);

  const goToPrevious = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const completeOnboarding = useCallback(async () => {
    await updateStep.mutateAsync(4);
  }, [updateStep]);

  return {
    currentStep,
    direction,
    goToNext,
    goToPrevious,
    completeOnboarding,
    isLoading: userLoading,
    user,
    crmJustConnected: searchParams.get('connected') === 'salesforce',
  };
}
