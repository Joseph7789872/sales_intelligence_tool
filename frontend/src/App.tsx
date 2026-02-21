import { useEffect } from 'react';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { setAuthTokenGetter } from '@/lib/api';
import { ProtectedRoute, OnboardingGate } from '@/features/auth/ProtectedRoute';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { DealsPage } from '@/features/deals/DealsPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { AnalysisDetailPage } from '@/features/dashboard/AnalysisDetailPage';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function AuthTokenSync() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  return null;
}

export function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <AuthTokenSync />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPlaceholder />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <OnboardingGate>
                    <DashboardPage />
                  </OnboardingGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/:analysisId"
              element={
                <ProtectedRoute>
                  <OnboardingGate>
                    <AnalysisDetailPage />
                  </OnboardingGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/deals"
              element={
                <ProtectedRoute>
                  <OnboardingGate>
                    <DealsPage />
                  </OnboardingGate>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function LandingPlaceholder() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          ICP Playbook Engine
        </h1>
        <p className="mt-3 text-text-secondary">
          Turn closed-won deals into repeatable sales playbooks.
        </p>
      </div>
    </div>
  );
}
