import { Box, Alert } from '@mui/material';
import { useState, createContext, useContext, useCallback, type ReactNode } from 'react';
import { LevelUpBanner } from './LevelUpBanner';
import { LuckyBonusSparkle } from './LuckyBonusSparkle';

// ── Toast Queue ──────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  type: 'level-up' | 'lucky-bonus' | 'info';
  data: { level?: number; label?: string; amount?: number; message?: string };
}

interface ToastContextValue {
  showLevelUp: (level: number, label: string) => void;
  showLuckyBonus: (amount: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showLevelUp: () => {},
  showLuckyBonus: () => {},
  showInfo: () => {},
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

  const showInfo = useCallback((message: string, duration = 3000) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, type: 'info', data: { message } }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showLevelUp, showLuckyBonus, showInfo }}>
      {toasts.length > 0 && (
        <Box sx={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 2000, maxWidth: 360, width: '100%', px: 2 }}>
          {toasts.map((t) =>
            t.type === 'level-up' ? (
              <LevelUpBanner key={t.id} level={t.data.level!} label={t.data.label!} />
            ) : t.type === 'lucky-bonus' ? (
              <LuckyBonusSparkle key={t.id} amount={t.data.amount!} />
            ) : (
              <Alert key={t.id} severity="success" variant="filled" sx={{ mb: 1 }}>
                {t.data.message}
              </Alert>
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
