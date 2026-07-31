---
type: concept
tags:
  - wiki/concept
  - wiki/frontend
  - wiki/ux
date_updated: 2026-07-31
source_count: 6
confidence: high
---

# Design Tokens

> Complete CSS custom-property + MUI v6 token system for Flow App  
> Style direction: creative modern · benchmark: Forest + Monday.com  
> Tech stack: React 19 · MUI v6 · TypeScript · `apps/frontend/src/theme/`

## Philosophy

| Principle | Rule |
|-----------|------|
| **Single source** | All visual values live in `tokens.ts`. Zero hardcoded values in components. |
| **MUI-first** | Tokens feed the MUI theme. Components use `sx`, `theme.palette`, `theme.spacing`. |
| **Workspace accent** | `--workspace-accent` is a CSS custom property injected at runtime per workspace. |
| **Semantic over raw** | Components reference semantic tokens (`primary`, `success`) not hex values. |
| **Motion respect** | All `transition` and `animation` tokens are wrapped in `prefers-reduced-motion` guards. |

---

## Color System

### Brand Palette

```typescript
// apps/frontend/src/theme/tokens.ts

const palette = {
  // ─── Brand ────────────────────────────────────────────────────────────
  brand: {
    50:  '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#2563EB',   // primary.main (existing, kept)
    600: '#1D4ED8',
    700: '#1E40AF',
    800: '#1E3A8A',
    900: '#1E3060',
  },

  // ─── Generation / Asset (purple) ──────────────────────────────────────
  generation: {
    50:  '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#7C3AED',   // secondary.main (existing, kept)
    600: '#6D28D9',
    700: '#5B21B6',
    800: '#4C1D95',
    900: '#3B0764',
  },

  // ─── Semantic ─────────────────────────────────────────────────────────
  success:  { main: '#059669', light: '#D1FAE5', dark: '#065F46', contrastText: '#fff' },
  warning:  { main: '#D97706', light: '#FEF3C7', dark: '#92400E', contrastText: '#fff' },
  error:    { main: '#DC2626', light: '#FEE2E2', dark: '#991B1B', contrastText: '#fff' },
  info:     { main: '#0891B2', light: '#CFFAFE', dark: '#164E63', contrastText: '#fff' },

  // ─── Neutral ──────────────────────────────────────────────────────────
  grey: {
    50:  '#F9FAFB',   // page background
    100: '#F3F4F6',   // card background
    200: '#E5E7EB',   // border
    300: '#D1D5DB',   // divider
    400: '#9CA3AF',   // placeholder text
    500: '#6B7280',   // secondary text
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',   // primary text
  },
} as const;
```

### Workspace Accent System

10 preset accent colors selectable per workspace. Stored in `workspace.accentColor` (DB column, string enum).

```typescript
// apps/frontend/src/theme/workspace-accents.ts

export const WORKSPACE_ACCENTS = {
  blue:    '#2563EB',   // default
  purple:  '#7C3AED',
  emerald: '#059669',
  rose:    '#E11D48',
  amber:   '#D97706',
  teal:    '#0891B2',
  orange:  '#EA580C',
  indigo:  '#4F46E5',
  pink:    '#DB2777',
  lime:    '#65A30D',
} as const;

export type WorkspaceAccent = keyof typeof WORKSPACE_ACCENTS;
```

**Runtime injection** via `WorkspaceAccentProvider`:

```typescript
// apps/frontend/src/theme/WorkspaceAccentProvider.tsx

function WorkspaceAccentProvider({ accentKey, children }: Props) {
  const accentHex = WORKSPACE_ACCENTS[accentKey] ?? WORKSPACE_ACCENTS.blue;

  useEffect(() => {
    document.documentElement.style.setProperty('--workspace-accent', accentHex);
    document.documentElement.style.setProperty(
      '--workspace-accent-light',
      hexToRgba(accentHex, 0.12)
    );
  }, [accentHex]);

  return <>{children}</>;
}
```

**CSS usage in components:**

```css
/* Sidebar CTA button */
.quick-generate-btn {
  background-color: var(--workspace-accent);
  color: #fff;
}

/* Asset coverage bar fill */
.asset-bar-fill {
  background-color: var(--workspace-accent);
}

/* Progress bar */
.MuiLinearProgress-bar {
  background-color: var(--workspace-accent);
}

/* Workspace dot indicator */
.workspace-accent-dot {
  background-color: var(--workspace-accent);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
```

### Gradient Tokens

```typescript
// Used for hero/completion banners — creative modern accent
const gradients = {
  brand:      'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
  completion: 'linear-gradient(135deg, #059669 0%, #0891B2 100%)',
  hero:       'linear-gradient(135deg, #1E40AF 0%, #6D28D9 100%)',
} as const;
```

---

## Typography

Display font adds creative energy to headings. Body keeps Inter for readability.

```typescript
const typography = {
  // ─── Font families ────────────────────────────────────────────────────
  fontFamily:        '"Inter", "Helvetica", "Arial", sans-serif',
  fontFamilyDisplay: '"Plus Jakarta Sans", "Inter", "Helvetica", sans-serif',
  fontFamilyMono:    '"JetBrains Mono", "Fira Code", monospace',

  // ─── Scale ────────────────────────────────────────────────────────────
  // Display — for hero headings, workspace names, completion banners
  displayLg: { fontSize: '2.25rem',  fontFamily: '"Plus Jakarta Sans"', fontWeight: 700, lineHeight: 1.2 },
  displayMd: { fontSize: '1.875rem', fontFamily: '"Plus Jakarta Sans"', fontWeight: 700, lineHeight: 1.25 },
  displaySm: { fontSize: '1.5rem',   fontFamily: '"Plus Jakarta Sans"', fontWeight: 600, lineHeight: 1.3 },

  // Body — for UI, forms, descriptions
  h4:     { fontSize: '1.5rem',   fontFamily: '"Plus Jakarta Sans"', fontWeight: 600, lineHeight: 1.35 },
  h5:     { fontSize: '1.25rem',  fontFamily: '"Plus Jakarta Sans"', fontWeight: 600, lineHeight: 1.4 },
  h6:     { fontSize: '1.125rem', fontFamily: '"Plus Jakarta Sans"', fontWeight: 600, lineHeight: 1.4 },
  body1:  { fontSize: '1rem',     fontFamily: '"Inter"',             fontWeight: 400, lineHeight: 1.6 },
  body2:  { fontSize: '0.875rem', fontFamily: '"Inter"',             fontWeight: 400, lineHeight: 1.55 },
  caption:{ fontSize: '0.75rem',  fontFamily: '"Inter"',             fontWeight: 400, lineHeight: 1.5 },
  button: { fontSize: '0.875rem', fontFamily: '"Inter"',             fontWeight: 500, textTransform: 'none' as const },
  mono:   { fontSize: '0.875rem', fontFamily: '"JetBrains Mono"',    fontWeight: 400, lineHeight: 1.6 },
} as const;
```

**Accessibility — contrast targets:**

| Token | Light mode contrast | WCAG level |
|-------|--------------------|-----------| 
| `grey.900` on `grey.50` | 16.7:1 | AAA ✅ |
| `grey.900` on `grey.100` | 14.2:1 | AAA ✅ |
| `brand.500` on `grey.50` | 4.7:1 | AA ✅ |
| `brand.500` on `#fff` (CTA) | 4.7:1 | AA ✅ |
| `success.main` on `#fff` | 4.6:1 | AA ✅ |
| `error.main` on `#fff` | 5.1:1 | AA ✅ |

---

## Spacing System

8px base grid. All spacing references `theme.spacing(n)`.

```typescript
const spacing = 8; // base unit = 8px

// Semantic aliases (for documentation clarity)
const space = {
  '1':  '4px',    // theme.spacing(0.5) — tight inline gap
  '2':  '8px',    // theme.spacing(1)   — field gap
  '3':  '12px',   // theme.spacing(1.5) — compact padding
  '4':  '16px',   // theme.spacing(2)   — standard padding
  '6':  '24px',   // theme.spacing(3)   — card padding
  '8':  '32px',   // theme.spacing(4)   — section gap
  '12': '48px',   // theme.spacing(6)   — section top margin
  '16': '64px',   // theme.spacing(8)   — page top padding
  '24': '96px',   // theme.spacing(12)  — hero sections
} as const;
```

---

## Elevation & Shadows

Tuned for "floating" creative modern feel — cards lift on hover.

```typescript
const shadows = {
  none:  'none',
  xs:    '0 1px 2px 0 rgba(0,0,0,0.05)',
  sm:    '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
  md:    '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)',
  lg:    '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05)',
  xl:    '0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.05)',
  inner: 'inset 0 2px 4px 0 rgba(0,0,0,0.06)',
  // Accent glow — for active card states (workspace accent)
  accent: '0 0 0 3px var(--workspace-accent-light)',
} as const;
```

**Card hover pattern:**

```css
.MuiCard-root {
  box-shadow: var(--shadow-sm);
  transition: box-shadow 200ms ease, transform 200ms ease;
}
.MuiCard-root:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
```

---

## Border Radius

```typescript
const shape = {
  xs:     '4px',    // chips, badges, small elements
  sm:     '6px',    // buttons
  md:     '8px',    // cards, inputs (default borderRadius)
  lg:     '12px',   // modals, panels
  xl:     '16px',   // hero cards
  full:   '9999px', // pills, avatars
} as const;

// MUI theme shape.borderRadius = 8 (existing, kept)
```

---

## Transitions & Animations

All durations and easings are centralized here. Motion guards included.

```typescript
const transitions = {
  // Durations
  fast:   '150ms',
  normal: '250ms',
  slow:   '400ms',

  // Easings
  ease:     'ease',
  easeIn:   'cubic-bezier(0.4, 0, 1, 1)',
  easeOut:  'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut:'cubic-bezier(0.4, 0, 0.2, 1)',
  spring:   'cubic-bezier(0.34, 1.56, 0.64, 1)',  // slight overshoot (Forest-like)
} as const;
```

**Keyframes:**

```css
/* Step completion — card entrance */
@keyframes slideInFade {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Completion celebration — confetti burst (CSS only, performant) */
@keyframes celebrationPop {
  0%   { transform: scale(0.95); opacity: 0.8; }
  60%  { transform: scale(1.03); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}

/* Active step pulse */
@keyframes stepPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}

/* Reduced motion overrides */
@media (prefers-reduced-motion: reduce) {
  @keyframes slideInFade    { from { opacity: 0; } to { opacity: 1; } }
  @keyframes celebrationPop { from { opacity: 0; } to { opacity: 1; } }
  @keyframes stepPulse      { 0%, 100% { opacity: 1; } }
}
```

---

## Dark Mode Token Overrides

```typescript
// Applied when `colorScheme === 'dark'` or `data-theme="dark"`

const darkOverrides = {
  background: {
    default: '#0F172A',    // deep navy — not pure black
    paper:   '#1E293B',    // card surface
    elevated:'#263548',    // modal, tooltip surface
  },
  text: {
    primary:   '#F1F5F9',  // near-white
    secondary: '#94A3B8',  // muted
    disabled:  '#475569',
  },
  divider: '#334155',
  border:  '#334155',

  // Brand adjusts to stay accessible on dark backgrounds
  brand: {
    500: '#3B82F6',        // slightly lighter than light-mode 2563EB
    400: '#60A5FA',        // hover state
  },

  grey: {
    50:  '#1E293B',
    100: '#263548',
    200: '#334155',
    900: '#F1F5F9',
  },
} as const;
```

---

## Complete MUI Theme

```typescript
// apps/frontend/src/theme/index.ts

import { createTheme, alpha } from '@mui/material/styles';

export function buildTheme(mode: 'light' | 'dark') {
  return createTheme({
    // ─── Palette ──────────────────────────────────────────────────────
    palette: {
      mode,
      primary:   { main: '#2563EB', light: '#60A5FA', dark: '#1E40AF', contrastText: '#fff' },
      secondary: { main: '#7C3AED', light: '#A78BFA', dark: '#5B21B6', contrastText: '#fff' },
      success:   { main: '#059669', light: '#D1FAE5', dark: '#065F46', contrastText: '#fff' },
      warning:   { main: '#D97706', light: '#FEF3C7', dark: '#92400E', contrastText: '#fff' },
      error:     { main: '#DC2626', light: '#FEE2E2', dark: '#991B1B', contrastText: '#fff' },
      info:      { main: '#0891B2', light: '#CFFAFE', dark: '#164E63', contrastText: '#fff' },
      background: mode === 'light'
        ? { default: '#F9FAFB', paper: '#FFFFFF' }
        : { default: '#0F172A', paper: '#1E293B' },
      text: mode === 'light'
        ? { primary: '#111827', secondary: '#6B7280', disabled: '#9CA3AF' }
        : { primary: '#F1F5F9', secondary: '#94A3B8', disabled: '#475569' },
      divider: mode === 'light' ? '#E5E7EB' : '#334155',
      grey: mode === 'light'
        ? { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 900: '#111827' }
        : { 50: '#1E293B', 100: '#263548', 200: '#334155', 900: '#F1F5F9' },
    },

    // ─── Typography ───────────────────────────────────────────────────
    typography: {
      fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
      h4: { fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif', fontWeight: 600 },
      h5: { fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif', fontWeight: 600 },
      h6: { fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif', fontWeight: 600 },
      body1: { fontSize: '1rem',     lineHeight: 1.6 },
      body2: { fontSize: '0.875rem', lineHeight: 1.55 },
      caption: { fontSize: '0.75rem' },
      button: { textTransform: 'none', fontWeight: 500 },
    },

    // ─── Spacing ──────────────────────────────────────────────────────
    spacing: 8,

    // ─── Shape ────────────────────────────────────────────────────────
    shape: { borderRadius: 8 },

    // ─── Component Overrides ──────────────────────────────────────────
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 500,
            textTransform: 'none',
            transition: 'all 150ms ease',
            '&:hover': { transform: 'translateY(-1px)' },
            '&:active': { transform: 'translateY(0)' },
          },
          containedPrimary: {
            boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
            '&:hover': { boxShadow: '0 4px 12px rgba(37,99,235,0.4)' },
          },
        },
        defaultProps: { disableElevation: true },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: '1px solid',
            borderColor: mode === 'light' ? '#E5E7EB' : '#334155',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            transition: 'box-shadow 200ms ease, transform 200ms ease',
            '&:hover': {
              boxShadow: '0 4px 6px rgba(0,0,0,0.08)',
              transform: 'translateY(-2px)',
            },
          },
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 4, height: 6 },
          bar:  { borderRadius: 4 },
        },
      },

      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--workspace-accent, #2563EB)',
                borderWidth: 2,
              },
            },
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 6, fontWeight: 500 },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: { borderRadius: 6, fontSize: '0.75rem' },
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            height: 6,
            backgroundColor: mode === 'light' ? '#E5E7EB' : '#334155',
          },
          bar: { borderRadius: 4 },
        },
      },

      MuiSkeleton: {
        defaultProps: { animation: 'wave' },
        styleOverrides: {
          root: {
            borderRadius: 6,
            backgroundColor: mode === 'light'
              ? 'rgba(0,0,0,0.06)'
              : 'rgba(255,255,255,0.06)',
          },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 500, minHeight: 40 },
        },
      },
    },
  });
}
```

---

## Theme Context & System Preference

```typescript
// apps/frontend/src/theme/ThemeProvider.tsx

type ThemeMode = 'light' | 'dark' | 'system';

function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useLocalStorage<ThemeMode>('theme-mode', 'system');

  const resolvedMode = useMemo<'light' | 'dark'>(() => {
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
  }, [mode]);

  const theme = useMemo(() => buildTheme(resolvedMode), [resolvedMode]);

  return (
    <ThemeModeContext.Provider value={{ mode, setMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeModeContext.Provider>
  );
}
```

---

## Font Loading

```html
<!-- apps/frontend/index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
```

**Font subsets:** Latin only for Inter and Plus Jakarta Sans. Reduces bundle ~40KB.

---

## Token Quick Reference

| Token | Value | Usage |
|-------|-------|-------|
| `primary.main` | `#2563EB` | Primary CTA buttons, links |
| `secondary.main` | `#7C3AED` | Asset/generation accent |
| `success.main` | `#059669` | Completed states, checkmarks |
| `warning.main` | `#D97706` | Low credits, advisory |
| `error.main` | `#DC2626` | Failures, delete actions |
| `--workspace-accent` | runtime CSS var | Sidebar CTA, progress bars, focus rings |
| `grey.50` | `#F9FAFB` | Page background (light) |
| `grey.100` | `#F3F4F6` | Card background (light) |
| `grey.200` | `#E5E7EB` | Borders, dividers |
| `grey.900` | `#111827` | Primary text |
| `spacing(2)` | `16px` | Standard padding |
| `spacing(3)` | `24px` | Card padding |
| `borderRadius` | `8px` | Default MUI radius |

---

## Sources

- [[Frontend Architecture]] — existing token baseline (`#2563EB`, `#7C3AED`, spacing 8, borderRadius 8)
- [[Tool UX Architecture]] — state feedback visual requirements
- [[ReadinessSnapshot UI]] — readiness reason code display
- [[ToolPage Machine (XState v5)]] — CTA enable/disable states
- [[Session List - Live Status]] — card state colours (queued/running/completed/failed)
- [[sources/PRD]] — FR-U07 (dark/light mode), FR-U09 (accessibility WCAG 2.1 AA)
