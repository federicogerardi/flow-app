import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AppShell } from './layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import ToolPage from './pages/ToolPage';
import SessionPage from './pages/SessionPage';
import ConversationPage from './pages/ConversationPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/workspaces/:workspaceId/tools/:toolKey" element={<ToolPage />} />
          <Route path="/workspaces/:workspaceId/sessions/:sessionId" element={<SessionPage />} />
          <Route path="/workspaces/:workspaceId/conversations/:conversationId" element={<ConversationPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
