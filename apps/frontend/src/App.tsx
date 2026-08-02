import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AppShell } from './layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import ToolPage from './pages/ToolPage';
import SessionPage from './pages/SessionPage';
import ConversationPage from './pages/ConversationPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { AuthGuard } from './auth/AuthGuard';
import { OAuthCallback } from './auth/OAuthCallback';
import { ErrorBoundary } from './components/ErrorBoundary';
import useSWR from 'swr';
import { api } from './api/client';

function WorkspaceRedirect() {
  const { data: workspaces } = useSWR('workspaces-redirect', () => api.listWorkspaces());
  const firstId = workspaces?.[0]?.id;
  if (!firstId) return <div>Loading...</div>;
  return <Navigate to={`/workspaces/${firstId}`} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — no auth required */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />

        {/* Protected routes */}
        <Route element={<AuthGuard />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<ErrorBoundary><WorkspaceRedirect /></ErrorBoundary>} />
            <Route path="/dashboard" element={<ErrorBoundary><WorkspaceRedirect /></ErrorBoundary>} />
            <Route path="/workspaces/:workspaceId" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
            <Route path="/workspaces/:workspaceId/tools/:toolKey" element={<ErrorBoundary><ToolPage /></ErrorBoundary>} />
            <Route path="/workspaces/:workspaceId/sessions/:sessionId" element={<ErrorBoundary><SessionPage /></ErrorBoundary>} />
            <Route path="/workspaces/:workspaceId/conversations/:conversationId" element={<ErrorBoundary><ConversationPage /></ErrorBoundary>} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;