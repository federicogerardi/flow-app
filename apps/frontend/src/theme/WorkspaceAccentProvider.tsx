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

export function WorkspaceAccentProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<string>(WORKSPACE_ACCENTS[0]);

  const setAccent = useCallback((color: string) => {
    setAccentState(color);
    document.documentElement.style.setProperty('--workspace-accent', color);
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
