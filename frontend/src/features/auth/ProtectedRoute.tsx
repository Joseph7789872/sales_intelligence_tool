import { useAuth, SignIn } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@/hooks/useUser';

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-3">
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
        <p className="text-sm text-text-muted">Loading...</p>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return <LoadingScreen />;

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <SignIn routing="hash" />
      </div>
    );
  }

  return <>{children}</>;
}

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useUser();

  if (isLoading) return <LoadingScreen />;

  if (user && user.onboardingStep < 4) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
