interface Step {
  label: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <div key={step.label} className="flex items-center">
            {/* Step circle + label */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  flex h-8 w-8 items-center justify-center rounded-full
                  text-sm font-semibold transition-all duration-300
                  ${
                    isCompleted
                      ? 'bg-success text-white'
                      : isActive
                        ? 'bg-accent text-white ring-4 ring-accent/20'
                        : 'bg-surface-200 text-text-muted'
                  }
                `}
              >
                {isCompleted ? (
                  <svg
                    className="h-4 w-4"
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
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`
                  mt-2 text-xs whitespace-nowrap
                  ${
                    isActive
                      ? 'font-medium text-text-primary'
                      : 'text-text-muted'
                  }
                `}
              >
                {step.label}
              </span>
            </div>

            {/* Connecting line */}
            {index < steps.length - 1 && (
              <div
                className={`
                  mx-3 mb-6 h-0.5 w-16 transition-colors duration-300
                  ${
                    index < currentStep
                      ? 'bg-success'
                      : 'bg-surface-200'
                  }
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
