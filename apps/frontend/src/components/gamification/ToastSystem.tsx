import { Box } from '@mui/material';
import { useState, createContext, useContext, useCallback, type ReactNode } from 'react';
import { LevelUpBanner } from './LevelUpBanner';
import { LuckyBonusSparkle } from './LuckyBonusSparkle';

// ── Toast Queue ──────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  type: 'level-up' | 'lucky-bonus';
  data: { level?: number; label?: string; amount?: number };
}

interface ToastContextValue {
  showLevelUp: (level: number, label: string) => void;
  showLuckyBonus: (amount: number) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showLevelUp: () => {},
  showLuckyBonus: () => {},
});

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showLevelUp = useCallback((level: number, label: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, type: 'level-up', data: { level, label } }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const showLuckyBonus = useCallback((amount: number) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, type: 'lucky-bonus', data: { amount } }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showLevelUp, showLuckyBonus }}>
      {toasts.length > 0 && (
        <Box sx={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 2000, maxWidth: 360, width: '100%', px: 2 }}>
          {toasts.map((t) =>
            t.type === 'level-up' ? (
              <LevelUpBanner key={t.id} level={t.data.level!} label={t.data.label!} />
            ) : (
              <LuckyBonusSparkle key={t.id} amount={t.data.amount!} />
            ),
          )}
        </Box>
      )}
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

export { LevelUpBanner, LuckyBonusSparkle };
