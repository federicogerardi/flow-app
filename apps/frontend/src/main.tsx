import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './theme/ThemeProvider';
import { WorkspaceAccentProvider } from './theme/WorkspaceAccentProvider';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WorkspaceAccentProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </WorkspaceAccentProvider>
  </React.StrictMode>,
);
