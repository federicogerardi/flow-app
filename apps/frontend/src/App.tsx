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
            <Route path="/" element={<WorkspaceRedirect />} />
            <Route path="/dashboard" element={<WorkspaceRedirect />} />
            <Route path="/workspaces/:workspaceId" element={<DashboardPage />} />
            <Route path="/workspaces/:workspaceId/tools/:toolKey" element={<ToolPage />} />
            <Route path="/workspaces/:workspaceId/sessions/:sessionId" element={<SessionPage />} />
            <Route path="/workspaces/:workspaceId/conversations/:conversationId" element={<ConversationPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;