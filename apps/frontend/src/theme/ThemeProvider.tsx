import { ThemeProvider as MuiThemeProvider, CssBaseline, useMediaQuery } from '@mui/material';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { theme, darkTheme } from './tokens';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue>({ mode: 'system', setMode: () => {} });

export function useThemeMode(): ThemeModeContextValue {
  return useContext(ThemeModeContext);
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('theme-mode');
    return (stored as ThemeMode) ?? 'system';
  });

  const isDark = mode === 'dark' || (mode === 'system' && prefersDark);
  const currentTheme = isDark ? darkTheme : theme;

  const handleSetMode = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem('theme-mode', newMode);
  }, []);

  return (
    <ThemeModeContext.Provider value={{ mode, setMode: handleSetMode }}>
      <MuiThemeProvider theme={currentTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeModeContext.Provider>
  );
}
