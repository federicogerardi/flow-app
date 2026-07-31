---
type: concept
tags:
  - wiki/concept
  - wiki/frontend
  - wiki/backend
  - wiki/governance
date_updated: 2026-07-30
source_count: 0
confidence: high
---

# Centralized Copy — Text Modules

> All user-facing text in dedicated modules. Zero hardcoded strings in components or logic.  
> `packages/copy/` (shared), consumed by `apps/frontend` and `apps/backend`

## Principle

Ogni stringa visibile all'utente — label, pulsante, messaggio di errore, notifica, tooltip, placeholder — vive in un modulo di testo centralizzato. Componenti e logica referenziano chiavi, mai stringhe letterali.

```
❌ Hardcoded in component:
<button>Genera</button>
throw new Error("File briefing mancante");

✅ From copy module:
<button>{copy.toolPage.cta.submit}</button>
throw new ReadinessError(Copy.errors.readiness.missingFile);
```

## Directory Structure

```
packages/copy/
├── src/
│   ├── index.ts              # Barrel: export copy
│   ├── it/                   # Italian (default)
│   │   ├── index.ts          # Barrel per lingua
│   │   ├── tool-page.ts      # ToolPage UI copy
│   │   ├── workspace.ts      # Workspace copy
│   │   ├── assets.ts         # Assets copy
│   │   ├── errors.ts         # Error messages
│   │   ├── notifications.ts  # Toast / notification copy
│   │   ├── admin.ts          # Admin panel copy
│   │   ├── auth.ts           # Auth pages copy
│   │   └── shared.ts         # Shared labels (cancel, save, etc.)
│   └── types.ts              # CopyKeys type for type-safety
├── package.json
└── tsconfig.json
```

## Copy Module Structure

```typescript
// packages/copy/src/it/shared.ts

export const shared = {
  actions: {
    cancel:   'Annulla',
    save:     'Salva',
    delete:   'Elimina',
    confirm:  'Conferma',
    retry:    'Riprova',
    download: 'Scarica',
    close:    'Chiudi',
  },
  status: {
    loading:   'Caricamento...',
    error:     'Si è verificato un errore',
    empty:     'Nessun elemento',
    success:   'Operazione completata',
  },
  format: {
    date:     'DD/MM/YYYY',
    datetime: 'DD/MM/YYYY HH:mm',
  },
} as const;
```

```typescript
// packages/copy/src/it/tool-page.ts

export const toolPage = {
  cta: {
    submit:     'Genera',
    submitting: 'Avvio in corso...',
    cancel:     'Annulla generazione',
    download:   'Scarica risultato',
    new:        'Nuova generazione',
  },
  readiness: {
    title:        'Pronto per generare?',
    allSet:       'Tutti i requisiti soddisfatti. Pronto per generare.',
    missingFile:  'Carica un file',
    missingText:  'Inserisci un valore',
    missingAsset: 'Seleziona un asset o creane uno',
    statusOk:      'Configurato',
    statusMissing: 'Richiesto — mancante',
    statusOptional:'Opzionale',
  },
  progress: {
    stepLabel:    'Step {current} di {total}',
    completed:    'Generazione completata',
    failed:       'Generazione fallita',
    cancelled:    'Generazione annullata',
    reconnecting: 'Riconnessione in corso...',
  },
  feedback: {
    sessionStarted:   'Generazione avviata',
    stepCompleted:    '"{label}" completato',
    sessionCompleted: 'Risultato pronto',
    sessionFailed:    'Errore durante "{label}"',
  },
  download: {
    formatMd:   'Markdown',
    formatDocx: 'Word',
    formatPdf:  'PDF',
    formatTxt:  'Testo',
  },
} as const;
```

```typescript
// packages/copy/src/it/errors.ts

export const errors = {
  readiness: {
    missingFile:  'File briefing mancante',
    missingText:  'Campo obbligatorio non compilato',
    missingAsset: 'Asset "{type}" richiesto ma non disponibile',
    missingWorkspace: 'Seleziona un workspace prima di iniziare',
  },
  generation: {
    llmTimeout:     'Il servizio di generazione non risponde. Riprova.',
    quotaExceeded:  'Crediti esauriti per questo mese. Si resettano il {date}.',
    artifactGate:   'Limite di generazioni raggiunto. Contatta l\'assistenza.',
    sessionNotFound:'Sessione non trovata',
    cancelled:      'Generazione annullata dall\'utente',
  },
  auth: {
    invalidCredentials: 'Email o password non validi',
    sessionExpired:     'Sessione scaduta. Effettua nuovamente il login.',
    unauthorized:       'Accesso non autorizzato',
    forbidden:          'Non hai i permessi per questa operazione',
  },
  workspace: {
    notFound:       'Workspace non trovato',
    nameRequired:   'Il nome del workspace è obbligatorio',
    deleteConfirm:  'Eliminare il workspace "{name}"? Questa azione è irreversibile.',
  },
  asset: {
    typeExists:     'Un asset di tipo "{type}" esiste già in questo workspace',
    notFound:       'Asset non trovato',
    uploadFailed:   'Caricamento file fallito',
  },
  network: {
    connectionLost: 'Connessione persa. Verifica la tua rete.',
    serverError:    'Errore del server. Riprova più tardi.',
    rateLimited:    'Troppe richieste. Attendi qualche secondo.',
  },
} as const;
```

```typescript
// packages/copy/src/it/workspace.ts

export const workspace = {
  list: {
    title:       'I tuoi workspace',
    empty:       'Nessun workspace. Creane uno per iniziare.',
    createCta:   'Nuovo workspace',
    createLabel: 'Nome workspace',
  },
  detail: {
    assets:       'Asset',
    recentSessions: 'Sessioni recenti',
    noSessions:   'Nessuna sessione. Avvia un tool per iniziare.',
    noAssets:     'Nessun asset. Genera un brief o una brand voice.',
  },
} as const;
```

```typescript
// packages/copy/src/it/assets.ts

export const assets = {
  types: {
    brief:          'Brief',
    'brand-voice':  'Brand Voice',
    persona:        'Buyer Persona',
    angle:          'Marketing Angle',
    'ad-copy':      'Ad Copy',
  },
  source: {
    generated: 'Generato',
    uploaded:  'Caricato',
    manual:    'Manuale',
  },
  actions: {
    create:    'Nuovo asset',
    edit:      'Modifica',
    delete:    'Elimina',
    promote:   'Promuovi ad asset',
    promoted:  'Promosso ad asset',
  },
} as const;
```

## Type-Safe Access

```typescript
// packages/copy/src/types.ts

import type { it } from './it';

// Estrae automaticamente il tipo di tutte le chiavi
type DeepKeyOf<T> = T extends object ? {
  [K in keyof T]: `${K & string}.${DeepKeyOf<T[K]> & string}`
}[keyof T] : never;

// Tipo per accesso type-safe: copy.t('toolPage.cta.submit')
type CopyKey = DeepKeyOf<typeof it>;
```

```typescript
// packages/copy/src/index.ts

import { it } from './it';

class Copy {
  private locale: Record<string, unknown>;

  constructor() {
    this.locale = it; // default: Italian
  }

  // Accesso type-safe con interpolazione
  t(key: string, params?: Record<string, string>): string {
    const parts = key.split('.');
    let value: unknown = this.locale;

    for (const part of parts) {
      value = (value as Record<string, unknown>)?.[part];
      if (value === undefined) {
        console.warn(`[copy] Missing key: ${key}`);
        return key; // fallback: mostra la chiave
      }
    }

    if (typeof value !== 'string') return key;

    // Interpolazione: sostituisce {param} con valori
    if (params) {
      return (value as string).replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
    }

    return value as string;
  }

  // Accesso diretto all'oggetto (per uso in componenti che preferiscono l'oggetto)
  get raw() {
    return it;
  }
}

export const copy = new Copy();
```

## Usage

### Frontend (React)

```tsx
// ❌ Hardcoded
<button disabled={!canSubmit}>Genera</button>
<p>Carica un file</p>

// ✅ From copy module
import { copy } from '@flow-app/copy';

<button disabled={!canSubmit}>{copy.t('toolPage.cta.submit')}</button>
<p>{copy.t('toolPage.readiness.missingFile')}</p>

// With interpolation
<p>{copy.t('errors.generation.quotaExceeded', { date: '01/08/2026' })}</p>
```

### Backend (Error Messages)

```typescript
// ❌ Hardcoded
throw new Error("Asset 'brand-voice' richiesto ma non disponibile");

// ✅ From copy module
import { copy } from '@flow-app/copy';

class MissingRequiredAssetError extends DomainError {
  readonly code = 'ASSET_MISSING';
  readonly retryable = true;

  constructor(assetType: string) {
    super(copy.t('errors.readiness.missingAsset', { type: assetType }));
  }
}
```

### Notification / Toast

```typescript
// ✅ Consistent notifications
toast.success(copy.t('shared.status.success'));
toast.error(copy.t('errors.network.connectionLost'));
toast.info(copy.t('toolPage.feedback.stepCompleted', { label: 'Analisi Briefing' }));
```

## Governance Rules

| Regola | Enforcement |
|--------|-------------|
| **Mai stringhe hardcoded** in componenti React | ESLint rule: `no-literal-string` (warn su JSX text) |
| **Mai stringhe hardcoded** in errori backend | Code review: ogni `throw new Error('...')` è una violation |
| **Mai stringhe hardcoded** in label/placeholder HTML | `aria-label`, `placeholder`, `title` devono usare copy |
| **Nuove chiavi in `packages/copy`**, mai inline | PR checklist: "No hardcoded strings" |
| **Chiavi semantiche**, non descrittive del contesto | `cta.submit` ✓ — `homepageBigBlueButton` ✗ |

## Future: Multi-Language

```typescript
// packages/copy/src/index.ts (future)

import { it } from './it';
import { en } from './en'; // futuro

const locales = { it, en };

class Copy {
  private lang: 'it' | 'en' = 'it';

  setLanguage(lang: 'it' | 'en'): void {
    this.lang = lang;
    this.locale = locales[lang];
  }

  t(key: string, params?: Record<string, string>): string {
    // ... same logic, reads from this.locale
  }
}
```

Struttura pronta per l'internazionalizzazione: aggiungere `packages/copy/src/en/` con gli stessi moduli e chiavi.

## Sources

- [[sources/PRD]] — Lingua output: Italiano (con possibilità di estensione futura)
- [[ToolPage Machine (XState v5)]] — UI states and labels
- [[Error Mapping (Domain to HTTP)]] — error messages