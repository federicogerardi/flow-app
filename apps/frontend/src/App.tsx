import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router';
import { AppShell } from './layout/AppShell';
import { AuthGuard } from './auth/AuthGuard';
import { OAuthCallback } from './auth/OAuthCallback';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorState } from './components/ErrorState';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { TeamHub } from './components/agent-chat/TeamHub';
import useSWR from 'swr';
import { api } from './api/client';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ToolPage = lazy(() => import('./pages/ToolPage'));
const SessionPage = lazy(() => import('./pages/SessionPage'));
const ConversationPage = lazy(() => import('./pages/ConversationPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));

function useFocusOnNavigate() {
  const { pathname } = useLocation();

  useEffect(() => {
    const heading = document.querySelector('main h1, main [role="heading"][aria-level="1"]');
    if (heading instanceof HTMLElement) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
    }
  }, [pathname]);
}

function WorkspaceRedirect() {
  const { data: workspaces, error } = useSWR('workspaces-redirect', () => api.listWorkspaces());
  const firstId = workspaces?.[0]?.id;
  if (error) return <ErrorState message={error.message} />;
  if (!firstId) return <LoadingSkeleton />;
  return <Navigate to={`/workspaces/${firstId}`} replace />;
}

function AppRoutes() {
  useFocusOnNavigate();

  return (
    <Routes>
      {/* Public routes — no auth required */}
      <Route path="/login" element={<Suspense fallback={<LoadingSkeleton />}><LoginPage /></Suspense>} />
      <Route path="/register" element={<Suspense fallback={<LoadingSkeleton />}><RegisterPage /></Suspense>} />
      <Route path="/auth/callback" element={<OAuthCallback />} />

      {/* Protected routes */}
      <Route element={<AuthGuard />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<ErrorBoundary><WorkspaceRedirect /></ErrorBoundary>} />
          <Route path="/dashboard" element={<ErrorBoundary><WorkspaceRedirect /></ErrorBoundary>} />
          <Route path="/workspaces/:workspaceId" element={<ErrorBoundary><Suspense fallback={<LoadingSkeleton />}><DashboardPage /></Suspense></ErrorBoundary>} />
          <Route path="/workspaces/:workspaceId/tools/:toolKey" element={<ErrorBoundary><Suspense fallback={<LoadingSkeleton />}><ToolPage /></Suspense></ErrorBoundary>} />
          <Route path="/workspaces/:workspaceId/sessions/:sessionId" element={<ErrorBoundary><Suspense fallback={<LoadingSkeleton />}><SessionPage /></Suspense></ErrorBoundary>} />
          <Route path="/workspaces/:workspaceId/conversations/:conversationId" element={<ErrorBoundary><Suspense fallback={<LoadingSkeleton />}><ConversationPage /></Suspense></ErrorBoundary>} />
          <Route path="/workspaces/:workspaceId/team" element={<ErrorBoundary><Suspense fallback={<LoadingSkeleton />}><TeamHub /></Suspense></ErrorBoundary>} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
