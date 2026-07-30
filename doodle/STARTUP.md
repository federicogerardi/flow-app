---
title: "Flow — Appunti e decisioni preliminari"
description: "Documento di bootstrap per lo sviluppo di Flow, suite AI-powered per la generazione di contenuti multi-step."
tags:
  - bootstrap
  - planning
  - architecture
project: flow-app
status: draft
---
Questo documento reccoglie appunti e decisioni preliminari per lo sviluppo dell'app Flow.
## Funzione
L'app è una suite di Tool AI-powered: ogni Tool è una capacità che concatena step di workflow basati su LLM per produrre artefatti. In pratica, un generatore di contenuti AI multi-step.
Ogni step riceve payload che può essere composto da:
- input diretto dell'utente
- upload di file da parte dell'utene
- selezione di asset già presenti in db (un asset è uno stato speciale di un artefatto che viene promosso all'interno di un workspace come asset)

## Definizioni
### Workspace
- Workspace: "A named workspace owned by a User that groups related Artifacts." È l'entità canonica DDD — un contenitore per raggruppare artefatti correlati, posseduto da un utente.
### Artefatto vs Asset
- Artifact: output persistente di un tentativo di generazione, con scope di sessione. Ha un lifecycle (generating → completed → failed), ruolo (step intermedio o final). È il record di ciò che è stato prodotto.
- Asset: risorsa persistente di workspace, riutilizzabile cross-tool. Nasce da: promozione di un Artifact completato (source = 'generated'), upload file ('uploaded'), o creazione manuale ('manual'). Ha un lifecycle indipendente dalla sessione.

In sintesi: 
- Artifact = cosa hai prodotto in una sessione. 
- Asset = proprietà del workspace, persistente e riutilizzabile come input per tool successivi.

## Backend
Governa l'intero ciclo di lavoro di ogni tool di generazione. Valida, popola e trasferisce dati tra gli step per arrivare all'artefatto finale e alla gestione di asset e workflow.
### ESEMPIO API BACKEND

#### Health

| Metodo   | Path    | Descrizione   |
|----------|---------|---------------|
| GET/HEAD | /health | Health check  |

#### Auth

| Metodo | Path                  | Descrizione                |
|--------|-----------------------|----------------------------|
| POST   | /auth/login           | Login email/password       |
| POST   | /auth/logout          | Logout                     |
| GET    | /auth/session         | Validazione sessione corrente |
| GET    | /auth/google/start    | Avvio OAuth Google         |
| GET    | /auth/google/callback | Callback OAuth Google      |

#### Generation

| Metodo | Path                | Descrizione                              |
|--------|---------------------|------------------------------------------|
| POST   | /generation/stream  | Generazione con streaming SSE in tempo reale |
| POST   | /generation/run     | Generazione non-streaming (JSON)         |

### API Pubbliche

#### Workspaces

| Metodo | Path                        | Descrizione             |
|--------|-----------------------------|-------------------------|
| GET    | /api/workspaces             | Lista workspaces dell'utente |
| POST   | /api/workspaces             | Crea workspace          |
| GET    | /api/workspaces/:workspaceId | Dettaglio workspace     |
| PUT    | /api/workspaces/:workspaceId | Aggiorna workspace      |

#### Artifacts

| Metodo | Path                              | Descrizione                      |
|--------|-----------------------------------|----------------------------------|
| GET    | /api/artifacts                    | Lista artefatti (filtrabile)     |
| GET    | /api/artifacts/:artifactId        | Dettaglio artefatto              |
| GET    | /api/artifacts/:artifactId/download | Download artefatto (md/txt/docx) |

#### Admin — Utenti, Modelli, API Services, Sessioni

| Metodo | Path                                      | Descrizione              |
|--------|-------------------------------------------|--------------------------|
| CRUD   | /admin/users + /:userId                   | Gestione utenti          |
| CRUD   | /api/admin/models + /:modelId             | Catalogo modelli LLM     |
| CRUD   | /api/admin/api-services + /:serviceId + bindings | Gestione API service |
| GET    | /api/admin/sessions + /:sessionId + download | Vista admin sessioni  |
L'applicazione è una piattaforma e suite di strumenti guidati dall'Intelligenza Artificiale, progettata per automatizzare, strutturare e velocizzare la creazione di contenuti, materiali di marketing e analisi strategiche di mercato.

La sua funzione principale è trasformare materiali grezzi (come appunti, file di briefing, descrizioni o ricerche di mercato) in documenti operativi ad alto valore — definiti **Artefatti** e **Asset di Workspace** — attraverso flussi di lavoro guidati e sequenziali.

## 1. Specifiche Funzionali

L'applicazione organizza le proprie funzionalità attorno al concetto di **Tool** (Strumento), ciascuno dedicato a una specifica capacità operativa:

### Catalogo degli Strumenti

- **Generazione di Copy e Contenuti Creativi**:
    
    - **Pagine di Sales & Funnel: Strutturazione e stesura di copy per sequenze di vendita, opt-in, quiz e landing page.
    - **Script Video Long-Form: Creazione guidata di script completi per YouTube.
    - **Angoli Strategici e Inserzioni: Identificazione di angoli di marketing e stesura di copy pubblicitari per campagne (es. Meta Ads).
        
    - **Articoli di Blog: Creazione guidata di articoli di blog in lingua italiana ottimizzati per la SEO.
        
    - **Descrizioni Rapide: Generazione immediata di descrizioni e testi brevi a partire da un input di testo diretto.
        
- **Strumenti Primitivi / Creatori di Asset Aziendali**:
    
    - **Brief e Tone of Voice: Estrazione da documenti grezzi (`.txt`, `.md`, `.docx`) e formalizzazione di Brief creativi e del Tono di Voce (Brand Voice) aziendale.
    - **Buyer Persona: Analisi e sintesi del profilo del cliente ideale.
        
- **Analisi e Ricerca di Mercato**:
    
    - **Analisi Competitiva: Analisi dei risultati dei motori di ricerca (SERP), calcolo del posizionamento dei competitor e generazione di report strategici unificati.
        

### Modello dei Workspace e degli Asset (Workspace & Asset Domain Model)

- **Organizzazione in Workspace**: Ogni attività è racchiusa all'interno di un Workspace di riferimento.
    
- **Promozione e Riutilizzo degli Asset**: Un documento chiave generato da un tool (come un Brief, una Persona o una Brand Voice) può essere promosso ad **Asset di Workspace**. Tale asset diventa una riserva di conoscenza condivisa riutilizzabile da altri strumenti per garantire coerenza strategica ed espressiva tra le varie generazioni.
    

### Area di Lavoro (Tool Workspace)

- **Pannello di Configurazione (Setup Panel)**: Consente l'inserimento dei dati tramite campi di testo, caricamento di file di briefing o selezione degli Asset salvati nel workspace.
    
- **Pannello di Avanzamento (Workflow Panel)**: Mostra il tracciamento visivo dello stato di avanzamento delle varie fasi di elaborazione.
    
- **Gestione Risultati e Sessioni (Session Summary)**: Permette la visualizzazione, la consultazione storica, il download e il rilancio (Relaunch) delle generazioni effettuate.
    

## 2. Specifiche Logiche e Regole di Dominio

Dal punto di vista logico e del flusso dei dati, l'applicazione rispetta le seguenti regole di business:

- **Catena Ordinata di Step (Ordered Step Chain)**:
    
    - Ogni Tool esegue una sequenza deterministica di passaggi logici (**WorkflowSteps**).
        
    - Gli step appartengono a categorie ben definite: _Extraction_ (estrazione dati da documenti), _Acquisition/Crawling_ (raccolta dati esterni), _Scoring_ (valutazione e punteggio) e _Generation_ (sintesi/stesura del testo).
        
- **Arricchimento Progressivo del Contesto (Progressive Context Enrichment)**:
    
    - L'output prodotto da uno step viene immesso logicamente come contesto di input per lo step successivo, consentendo un affinamento sequenziale del contenuto.
        
- **Politica dei Requisiti di Input (Readiness & Policy)**:
    
    - L'avvio di un flusso è regolato da una verifica logica dei requisiti obbligatori (es. presenza del file di briefing primario o asset required).
        
    - Il sistema abilita l'azione principale solo quando le condizioni vincolanti sono soddisfatte, gestendo i file o i parametri secondari come opzionali non bloccanti.
        
- **Ciclo di Vita dell'Artefatto e della Sessione**:
    
    - Ogni fase di generazione produce un **Artefatto**. Gli output intermedi hanno un ruolo logico di supporto ("step"), mentre l'output finale ha il ruolo di deliverable definitivo ("final").
        
    - Il lavoro viene raggruppato in **Sessioni**, garantendo la tracciabilità delle esecuzioni, l'idempotenza delle operazioni e la possibilità di riprendere il flusso da uno stato di interruzione precedente.