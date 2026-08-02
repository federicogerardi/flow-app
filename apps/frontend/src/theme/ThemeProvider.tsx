import { ThemeProvider as MuiThemeProvider, CssBaseline, useMediaQuery } from '@mui/material';
import type { ReactNode } from 'react';
import { theme, darkTheme } from './tokens';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const currentTheme = prefersDark ? darkTheme : theme;

  return (
    <MuiThemeProvider theme={currentTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
