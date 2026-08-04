import { Box, Typography, keyframes } from '@mui/material';
import { useState, createContext, useContext, useCallback, type ReactNode } from 'react';

const slideIn = keyframes`
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const sparkle = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
`;

export function LevelUpBanner({ level, label }: { level: number; label: string }) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
        color: 'white',
        animation: `${slideIn} 400ms ease-out`,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        mb: 2,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <Typography variant="h4" component="span">🎉</Typography>
      <Box>
        <Typography variant="h6" fontWeight={700}>
          Level Up! Lv.{level} — {label}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          You unlocked new rewards and recognition
        </Typography>
      </Box>
    </Box>
  );
}

export function LuckyBonusSparkle({ amount }: { amount: number }) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
        color: 'white',
        animation: `${sparkle} 400ms ease-in-out 2`,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        mb: 1,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <Typography variant="h5" component="span">✨</Typography>
      <Box>
        <Typography variant="body2" fontWeight={700}>
          Lucky Bonus! +{amount} XP
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.9 }}>
          Exceptional output detected — double reward
        </Typography>
      </Box>
    </Box>
  );
}

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
        <Box sx={{ position: 'fixed', top: 72, right: 24, zIndex: 2000, maxWidth: 360 }}>
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
