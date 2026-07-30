# Gen App 2 — Product Requirement Document

> Versione: 1.0 — Stato: **Draft** — Ultimo aggiornamento: 2026-07-30

---

## 1. Visione Prodotto

Gen App 2 è una piattaforma AI-powered di content generation che trasforma input contestuali (briefing, documenti, keyword) in output di marketing pronti all'uso attraverso pipeline multi-step deterministiche, trasparenti e tracciabili.

**Value proposition**: ogni step di generazione è visibile, rieseguibile, versionato e associato al workspace di progetto. Nessuna black box — l'utente ha sempre il controllo sulla catena di produzione dei contenuti.

**Obiettivo strategico**: diventare lo strumento principale di content creation per team marketing B2B, coprendo l'intero ciclo: ricerca competitiva → estrazione insight → produzione contenuti → asset riutilizzabili.

---

## 2. User Personas & JTBD

### Persona 1: Content Marketer
- **Ruolo**: Marketing Manager / Content Strategist in azienda B2B
- **JTBD primario**: "Quando devo produrre contenuti multicanale per una campagna, voglio generare landing page, script video e articoli coerenti tra loro, senza dover ripartire da zero per ogni formato"
- **Bisogni**: coerenza cross-canale, velocità di produzione, riutilizzo asset brand

### Persona 2: SEO & Competitive Analyst
- **Ruolo**: SEO Specialist / Growth Marketer
- **JTBD primario**: "Quando analizzo un mercato, voglio capire chi sono i competitor, cosa dicono e come posizionarmi, senza dover fare manualmente scraping e scoring"
- **Bisogni**: analisi SERP strutturata, report strategici esportabili, dati crawling verificabili

### Persona 3: Amministratore di Sistema
- **Ruolo**: Admin / Platform Owner
- **JTBD primario**: "Quando gestisco la piattaforma, voglio configurare modelli LLM, API service e permessi senza toccare codice, e monitorare lo stato delle generazioni"
- **Bisogni**: CRUD admin per modelli e API service, monitoring errori, gestione utenti/ruoli

---

## 3. Requisiti Funzionali

### 3.1 Tool Catalog — Strumenti di Generazione

| ID | Requisito | Priorità | Stato |
|----|-----------|----------|-------|
| **FR-T01** | **Funnel Pages**: generare landing page funnel (optin → quiz → VSL) da briefing file | P0 | ✅ Implementato |
| **FR-T02** | **Nextland**: generare pagine landing + thank-you da briefing file | P0 | ✅ Implementato (admin-only) |
| **FR-T03** | **YouTube LF Script**: generare script long-form 6-step (analisi → packaging → intro → body → CTA → outro) | P0 | ✅ Implementato |
| **FR-T04** | **Angle Generator**: estrarre angoli marketing da 2 file (Briefing + AngleDetector), produrre `angle` Asset | P0 | ✅ Implementato |
| **FR-T05** | **YouTube Description**: generare descrizioni video da direct input (social links, hashtag), no file richiesto | P0 | ✅ Implementato |
| **FR-T06** | **Geometric**: analisi SERP competitiva 4-step (crawling → scoring → strategic report → unified report) via SerpAPI | P0 | ✅ Implementato |
| **FR-T07** | **Blog Article Generator**: generare articoli blog SEO 3-step (struttura SEO → outline → articolo) | P0 | ✅ Implementato |
| **FR-T08** | **Brief Generator**: generare `brief` Asset da file upload (single-step primitive tool) | P0 | ✅ Implementato |
| **FR-T09** | **TOV Generator**: generare `brand-voice` Asset da file upload; primo producer di brand voice per 7 tool downstream | P0 | ✅ Implementato |
| **FR-T10** | **Personas Generator**: generare `persona` Asset da file upload | P0 | ✅ Implementato |
| **FR-T11** | **Meta Ads**: generare copy per Meta Ads da file + direct input, produrre `ad-copy` Asset | P1 | ✅ Riattivato |

### 3.2 Workflow & Generazione

| ID         | Requisito                                                                                                                   | Priorità | Stato                                       |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------- |
| **FR-W01** | BE-Driven Workflow: esecuzione asincrona multi-step via BullMQ, FE riceve progress via SSE, indipendente dal tab browser    | P0       | ✅ Implementato                              |
| **FR-W02** | Idempotency: prevenire generazioni duplicate tramite `IdempotencyKey`, supporto replay e conflict detection                 | P0       | ✅ Implementato                              |
| **FR-W03** | Resume/Regenerate: possibilità di riprendere workflow interrotti e rigenerare step specifici da checkpoint                  | P0       | ✅ Implementato                              |
| **FR-W04** | Cancellazione: `POST /cancel` per fermare workflow attivi (flag controllato a ogni step boundary)                           | P0       | ✅ Implementato                              |
| **FR-W05** | Crediti a due livelli: artifact gate (anti-abuso, invisibile) + consumo crediti solo su step finale                         | P0       | ✅ Implementato                              |
| **FR-W06** | Per-step LLM model override: configurazione statica che assegna modelli deterministici specifici per ogni step di ogni tool | P1       | 🔄 Parziale (3 step blog-article-generator) |
| **FR-W07** | Global Deterministic Model Matrix: estendere FR-W06 a tutti i 22 step LLM rimanenti (DDD-234)                               | P1       | 📝 Proposta (0/22 implementati)             |
| **FR-W08** | Output Personalization: multi-variant fan-out, HITL interactive steps, feedback loop RAG-lite                               | P2       | 📝 Proposta (0/23 task)                     |
| **FR-W09** | Project Brand Persona: iniezione automatica di brand voice a livello progetto in tutti i prompt                             | P2       | 📝 Proposta                                 |

### 3.3 Workspace & Asset

| ID | Requisito | Priorità | Stato |
|----|-----------|----------|-------|
| **FR-A01** | Asset Management: CRUD per `brief`, `brand-voice`, `persona`, `angle`, `ad-copy` a livello progetto | P0 | ✅ Implementato |
| **FR-A02** | Asset Injection: risoluzione automatica degli Asset nel prompt di generazione via `AssetFieldMapping` | P0 | ✅ Implementato |
| **FR-A03** | Knowledge Panel: selezione Asset nel ToolPage Setup, con hard-block per asset `always-required` | P0 | ✅ Implementato |
| **FR-A04** | Promote-to-Asset: promozione output di generazione ad Asset riutilizzabile con mapping deterministico `toolKey→assetType` | P0 | ✅ Implementato |
| **FR-A05** | Workspace Dashboard: vista centrale con pannelli workspace-centric, card-variant layout | P0 | ✅ Implementato (parziale: `FoundationToolsPanel` mancante) |
| **FR-A06** | README di Progetto: definizione e visualizzazione di un README per ogni progetto | P1 | 🔄 Parziale |

### 3.4 Amministrazione

| ID | Requisito | Priorità | Stato |
|----|-----------|----------|-------|
| **FR-AD01** | Gestione Utenti: CRUD admin per utenti, ruoli (`admin`/`member`), status | P0 | ✅ Implementato |
| **FR-AD02** | Gestione Modelli LLM: CRUD admin per `LlmModel` (enable/disable, sort order, label) | P0 | ✅ Implementato |
| **FR-AD03** | Gestione API Service: CRUD admin per `ApiService` (endpoint, autenticazione, tool-step binding) | P0 | ✅ Implementato |
| **FR-AD04** | Product Changelog: pubblicazione e visualizzazione changelog con status e audience target | P1 | ✅ Implementato |
| **FR-AD05** | User Report: sistema di feedback/report utente con categorie, status e GitHub issue linking | P1 | ✅ Implementato |
| **FR-AD06** | Geometric Admin Debug: endpoint verifica crawling, tracking errori strutturato, AI Overview confidence score | P2 | 📝 Proposta (0/4 item) |

### 3.5 Autenticazione & Sicurezza

| ID | Requisito | Priorità | Stato |
|----|-----------|----------|-------|
| **FR-S01** | Autenticazione OAuth (Google, GitHub) + email/password | P0 | ✅ Implementato |
| **FR-S02** | Role-based access control: `admin` vs `member`, route guard lato frontend e backend | P0 | ✅ Implementato |
| **FR-S03** | CSRF protection fail-closed: startup invariant che blocca l'avvio se configurazione CSRF assente | P0 | ✅ Implementato |
| **FR-S04** | Rate limiting: sliding window per-user via Redis `INCR`/`EXPIRE` | P0 | ✅ Implementato |
| **FR-S05** | Quota enforcement: crediti mensili + artifact gate anti-abuso via Redis + PostgreSQL audit trail | P0 | ✅ Implementato |
| **FR-S06** | Session security: JWT + refresh token, logout invalidation, session listing | P0 | ✅ Implementato |

### 3.6 Interfaccia Utente

| ID | Requisito | Priorità | Stato |
|----|-----------|----------|-------|
| **FR-U01** | Registry-Driven Tool Pages: single `ToolPageTemplate` (~150 LOC), nuovo tool = 5 file, ~100 linee, ~30 min | P0 | ✅ Implementato |
| **FR-U02** | Readiness Snapshot: valutazione start-eligibility con reason code tipizzati (`missing_project`, `missing_extraction_context`, etc.) | P0 | ✅ Implementato |
| **FR-U03** | Canonical UI State Derivation: 8 stati deterministici (`draft-empty` → `completed`), CTA policy derivata automaticamente | P0 | ✅ Implementato |
| **FR-U04** | Explicit Error States: nessun `error: string | null`; errori modellati come compound state XState (ADR-003) | P0 | ✅ Implementato |
| **FR-U05** | Unified Feedback Panel: singolo `ToolFeedbackPanel` con card-based progress, state-driven (non feature-flagged) | P0 | ✅ Implementato |
| **FR-U06** | UI Governance: 2 archetype pagina, 3 pattern CTA, design token only, feedback channel deterministici | P0 | ✅ Implementato |
| **FR-U07** | Accessibility: navigazione tastiera, focus visibile, label screen-reader, messaggi errore actionable | P0 | ✅ Implementato (test a11y attivi) |
| **FR-U08** | Dark/Light mode: tema MUI con `defaultMode="system"` | P1 | ✅ Implementato |
| **FR-U09** | Session History: navigazione `SessionSummary` → dettaglio sessione → download artefatti | P0 | ✅ Implementato |
| **FR-U10** | Artifact History: listing globale artefatti con filtro per progetto e tipo | P1 | ✅ Implementato |
| **FR-U11** | Download esportazione: session download in formato `.docx` e `.pdf` | P0 | ✅ Implementato |

---

## 4. Requisiti Non-Funzionali

### 4.1 Performance
| ID | Requisito | Target |
|----|-----------|--------|
| **NFR-P01** | Latenza submit job: risposta `POST /api/tools/jobs` con `jobId` entro 500ms | P95 < 500ms |
| **NFR-P02** | Connessione SSE: stabilita entro 2 secondi dal submit | P95 < 2s |
| **NFR-P03** | Throughput BullMQ: supportare N job paralleli per utente (configurabile via concurrency) | Almeno 3 job/utente |
| **NFR-P04** | Connection pool PostgreSQL: `PG_POOL_MAX` configurable, default 20 | Nessun saturation sotto carico normale |
| **NFR-P05** | Timeout generazione: singolo step LLM timeout configurabile con fallback graceful | Timeout + retry da zero con idempotency |

### 4.2 Affidabilità
| ID | Requisito |
|----|-----------|
| **NFR-R01** | Nessuna perdita dati: ogni `Artifact` persistito in PostgreSQL prima della notifica FE |
| **NFR-R02** | Idempotency garantita: `IdempotencyKey` scoped per `(userId, projectId, endpoint)` con atomic claim via Redis |
| **NFR-R03** | Job retry: fallimenti riprovati da zero con stessa idempotency key (no resume intermedio) |
| **NFR-R04** | Graceful degradation: se Redis non disponibile, idempotency e rate limiting falliscono closed (negano l'operazione) |
| **NFR-R05** | Backup: PostgreSQL backup automatico via Railway |

### 4.3 Sicurezza
| ID | Requisito |
|----|-----------|
| **NFR-S01** | HTTPS only in production |
| **NFR-S02** | API key e secret mai in chiaro nei log (Pino redaction) |
| **NFR-S03** | Validazione input: Zod schema per ogni endpoint, reject early |
| **NFR-S04** | CORS: same-origin policy, proxy `server.mjs` per FE/BE collocation |
| **NFR-S05** | Token API service: `tokenHeaderName` validato strict, mai esposto in response pubbliche |

### 4.4 Osservabilità
| ID | Requisito |
|----|-----------|
| **NFR-O01** | Structured logging: Pino con correlation ID su ogni richiesta |
| **NFR-O02** | Metriche deployment: Railway dashboard per CPU, memoria, HTTP error rate, response time |
| **NFR-O03** | Alerting: error rate > 5% o response time P95 > 5s attiva notifica |
| **NFR-O04** | Audit trail: `quota_history` in PostgreSQL per ogni consumo crediti |

### 4.5 Manutenibilità
| ID | Requisito |
|----|-----------|
| **NFR-M01** | Code sharing: `packages/contracts` come fonte autoritativa unica FE/BE con compile-time parity guard |
| **NFR-M02** | Domain isolation: `packages/domain` framework-agnostic, zero import da FE/BE |
| **NFR-M03** | Test coverage: frontend ≥70% lines, ≥60% branches; backend test con Node built-in runner |
| **NFR-M04** | Documentation-first: ogni modifica richiede aggiornamento docs, decisioni DDD tracciate nel log |

---

## 5. User Experience Requirements

### 5.1 Flusso di Generazione Ideale
1. L'utente seleziona un Tool dal workspace
2. Carica i file richiesti (se previsti) e compila i form field
3. Il sistema valuta la readiness (`ReadinessSnapshot`) e mostra CTA condizionali
4. L'utente seleziona eventuali Asset (`brand-voice`, `persona`, etc.) dal Knowledge Panel
5. Al submit, il sistema accoda un `ToolWorkflowJob` e restituisce immediatamente il controllo
6. L'utente vede il progresso step-by-step via card-based UI (`ToolFeedbackPanel`)
7. Al completamento, gli artefatti sono disponibili per download e promozione ad Asset

### 5.2 Principi UX
- **Determinismo**: stesso input → stesso output prevedibile (obiettivo `Global Deterministic Model Matrix`)
- **Progressive disclosure**: mostra ciò che serve ora, rimanda il resto (card-based progress)
- **Zero eccezioni tool-specifiche**: ogni tool segue gli stessi pattern UI, differisce solo per configurazione
- **Feedback immediato**: ogni azione utente ha un feedback channel mappato (`inline-action` | `page-state` | `global`)
- **Mai bloccante senza ragione**: CTA disabilitato solo con reason code esplicito e messaggio informativo

---

## 6. Vincoli Tecnici

| Vincolo | Dettaglio |
|---------|-----------|
| **Monorepo** | npm workspaces: `apps/backend`, `apps/frontend`, `packages/contracts`, `packages/domain`, `packages/infra-db` |
| **Runtime** | Node.js (backend), React 19 (frontend) |
| **State Management** | XState v5 per entrambi i lati (pattern Aggregate Root) |
| **Database** | PostgreSQL via Kysely (query builder tipizzato) + Redis per cache/lock/rate-limit |
| **Job Queue** | BullMQ su Redis (per `ToolWorkflowJob`) |
| **Deployment** | Railway, Dockerfile-based, single process (HTTP + Worker) |
| **Browser support** | Ultime 2 versioni di Chrome, Firefox, Safari, Edge |
| **Lingua output** | Italiano (con possibilità di estensione futura) |

---

## 7. Roadmap

### Orizzonte 1 — Completamento (Q3 2026)
| Epic | Stato | Note |
|------|-------|------|
| Global Deterministic Model Matrix | 📝 Proposta | 22 step da assegnare a 4 tier di modelli (Premium/Balanced/Light/Search) |
| Workspace Dashboard completamento | 🔄 Parziale | `FoundationToolsPanel` mancante |
| Prompt Layer Quality | ✅ Completato | 34 template aggiornati con anti-hallucination, chain awareness |
| BE-Driven Workflow stabilization | ✅ Completato | Monitoraggio produzione, tuning performance |
| Admin pages → `ListingTableSection` | 📝 Aperto | Migrazione pagine admin a componente tabella unificato |

### Orizzonte 2 — Espansione (Q4 2026)
| Epic | Stato | Note |
|------|-------|------|
| Output Personalization | 📝 Proposta (0/23 task) | 5 pilastri: registry, brand persona, HITL, variant fan-out, feedback RAG |
| Geometric Admin Debug & Monitoring | 📝 Proposta (0/4 item) | Verifica crawling, error tracking strutturato, AI Overview validation |
| Session Aggregation avanzata | 📝 Draft | Guida implementazione esistente, rollout progressivo |
| CTA convergence (MUI vs native) | 🔄 Parziale | Richiede ADR per standardizzare sistema bottoni |

### Orizzonte 3 — Visione (2025)
| Epic | Note |
|------|------|
| Multi-tenant workspace | Isolamento progetti e team |
| Collaborative editing | Multi-utente simultaneo su stesso workflow |
| Modello crediti avanzato | Piani tariffari, credit pooling, overage |
| API pubblica | Endpoint documentati per integrazioni esterne |
| Internazionalizzazione | Supporto multi-lingua per output generati |

---

## 8. Acceptance Criteria Generali

Ogni feature implementata deve soddisfare:

1. **DDD Compliance**: tutti i termini usati sono canonici (glossary + decision log), nessun termine non registrato
2. **Test Coverage**: frontend ≥70% lines, test backend per ogni nuovo actor/machine
3. **Typecheck**: `npm run typecheck` passa in tutti i workspace
4. **UI Governance**: archetype dichiarato, canonical terms usati, CTA pattern corretti, design token only, feedback channel mappati
5. **A11y**: tastiera navigabile, focus visibile, label accessibili, messaggi errore non solo color-based
6. **Observability**: log strutturati con correlation ID per ogni nuovo percorso di esecuzione
7. **Documentation**: PR accompagnata da aggiornamento docs + voce DDD-NNN se nuovi concetti di dominio

---

## 9. Metriche di Successo

| Metrica | Target | Misurazione |
|---------|--------|-------------|
| **Time-to-first-artifact** | < 3 minuti dal submit per tool standard | Telemetria backend |
| **Generation success rate** | > 95% | `ArtifactStatus = 'completed'` / totale |
| **User activation** | > 70% degli utenti registrati completano almeno 1 generazione | Analytics |
| **Asset reuse rate** | > 50% delle generazioni consumano almeno 1 Asset | Query su `asset_injection` log |
| **NPS / CSAT** | > 40 NPS, > 4.0/5 CSAT | Survey integrata (futura) |
| **Error rate HTTP** | < 1% (5xx) | Railway HTTP logs |

---

> ⚑ **DDD Reference**: [Glossary](docs/01-requirements/domain-ubiquitous-language-glossary.md) · [BCM](docs/02-design/domain-bounded-context-map.md) · [Decision Log](docs/07-governance/domain-naming-decision-log.md) · [Documentation Index](docs/index-overview.md) · [App Concept](APP-CONCEPT.md)
