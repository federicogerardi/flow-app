import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './theme/ThemeProvider';
import { WorkspaceAccentProvider } from './theme/WorkspaceAccentProvider';
import { AuthProvider } from './auth/AuthContext';
import { ToastProvider } from './components/gamification/ToastSystem';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <WorkspaceAccentProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </WorkspaceAccentProvider>
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>,
);