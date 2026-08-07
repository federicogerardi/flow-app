import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

const WORKSPACE_ACCENTS = [
  '#2563eb', '#7c3aed', '#059669', '#dc2626',
  '#d97706', '#0891b2', '#ea580c', '#4f46e5',
  '#db2777', '#65a30d',
] as const;

interface AccentContextValue {
  accent: string;
  setAccent: (color: string) => void;
}

const AccentContext = createContext<AccentContextValue>({
  accent: WORKSPACE_ACCENTS[0],
  setAccent: () => {},
});

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function WorkspaceAccentProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<string>(WORKSPACE_ACCENTS[0]);

  const setAccent = useCallback((color: string) => {
    setAccentState(color);
    document.documentElement.style.setProperty('--workspace-accent', color);
    document.documentElement.style.setProperty('--workspace-accent-light', hexToRgba(color, 0.12));
  }, []);

  return (
    <AccentContext.Provider value={{ accent, setAccent }}>
      {children}
    </AccentContext.Provider>
  );
}

export function useWorkspaceAccent(): string {
  return useContext(AccentContext).accent;
}

export { WORKSPACE_ACCENTS };
