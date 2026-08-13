import { createTheme } from '@mui/material/styles';

const tokens = {
  palette: {
    primary: { main: '#2563eb', light: '#60a5fa', dark: '#1d4ed8', contrastText: '#fff' },
    secondary: { main: '#7c3aed', light: '#a78bfa', dark: '#5b21b6', contrastText: '#fff' },
    success: { main: '#059669', light: '#d1fae5', dark: '#047857', contrastText: '#fff' },
    warning: { main: '#d97706', light: '#fef3c7', dark: '#b45309', contrastText: '#fff' },
    error: { main: '#dc2626', light: '#fee2e2', dark: '#b91c1c', contrastText: '#fff' },
    info: { main: '#0891b2', light: '#cffafe', dark: '#164e63', contrastText: '#fff' },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#334155',
    },
    divider: '#e2e8f0',
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 700, fontSize: '2rem' },
    h2: { fontWeight: 600, fontSize: '1.5rem' },
    h3: { fontWeight: 600, fontSize: '1.25rem' },
    h4: { fontWeight: 600, fontSize: '1.125rem' },
    h5: { fontWeight: 600, fontSize: '1rem' },
    h6: { fontWeight: 600, fontSize: '0.875rem' },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    button: { textTransform: 'none' as const, fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
};

// ── Rarity Tokens (light mode) ────────────────────────────────────────────────
export const rarity = {
  common:    { border: '#9CA3AF', bg: '#F3F4F6', text: '#374151' },
  rare:      { border: '#3B82F6', bg: '#EFF6FF', text: '#1E40AF' },
  epic:      { border: '#7C3AED', bg: '#F5F3FF', text: '#5B21B6' },
  legendary: { border: '#D97706', bg: '#FFFBEB', text: '#92400E' },
} as const;

export const rarityDark = {
  common:    { border: '#6B7280', bg: '#1F2937', text: '#D1D5DB' },
  rare:      { border: '#3B82F6', bg: '#1E3A5F', text: '#93C5FD' },
  epic:      { border: '#7C3AED', bg: '#3B1F6E', text: '#C4B5FD' },
  legendary: { border: '#D97706', bg: '#451A03', text: '#FCD34D' },
} as const;

// ── Gradient Tokens ───────────────────────────────────────────────────────────
export const gradients = {
  brand:      'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
  hero:       'linear-gradient(135deg, #1E40AF 0%, #6D28D9 100%)',
} as const;

// ── Shadow Tokens ─────────────────────────────────────────────────────────────
export const shadows = {
  accent: '0 0 0 3px var(--workspace-accent-light, rgba(37, 99, 235, 0.12))',
} as const;

export const theme = createTheme(tokens);

export const darkTheme = createTheme({
  ...tokens,
  palette: {
    ...tokens.palette,
    mode: 'dark',
    primary: {
      main: '#3b82f6',       // brand.500 in dark mode — 5.04:1 on #0f172a (WCAG AA ✅)
      light: '#60a5fa',      // brand.400 — hover state
      dark: '#1d4ed8',       // pressed state
      contrastText: '#fff',
    },
    secondary: {
      main: '#a78bfa',       // secondary.light from light theme
      light: '#c4b5fd',
      dark: '#7c3aed',
      contrastText: '#fff',
    },
    success: {
      main: '#34d399',
      light: '#d1fae5',
      dark: '#059669',
      contrastText: '#111827',
    },
    warning: {
      main: '#fbbf24',
      light: '#fef3c7',
      dark: '#d97706',
      contrastText: '#111827',
    },
    error: {
      main: '#f87171',
      light: '#fee2e2',
      dark: '#dc2626',
      contrastText: '#111827',
    },
    info: {
      main: '#22d3ee',
      light: '#cffafe',
      dark: '#0891b2',
      contrastText: '#111827',
    },
    grey: {
      50: '#1e293b',       // page background — wiki: dark grey.50
      100: '#263548',      // card background — wiki: dark grey.100
      200: '#334155',      // border — wiki: dark grey.200
      900: '#f1f5f9',      // primary text — wiki: dark grey.900
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
      disabled: '#475569',   // wiki: dark text.disabled
    },
    divider: '#334155',
  },
});
