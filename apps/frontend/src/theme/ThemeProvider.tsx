import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import type { ReactNode } from 'react';
import { theme, darkTheme } from './tokens';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const prefersDark = typeof window !== 'undefined'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const currentTheme = prefersDark ? darkTheme : theme;

  return (
    <MuiThemeProvider theme={currentTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
