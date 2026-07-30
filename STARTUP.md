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
Metodo	Path	Descrizione
GET/HEAD	/health	Health check
Auth
Metodo	Path	Descrizione
POST	/auth/login	Login email/password
POST	/auth/logout	Logout
GET	/auth/session	Validazione sessione corrente
GET	/auth/google/start	Avvio OAuth Google
GET	/auth/google/callback	Callback OAuth Google
#### Generation
Metodo	Path	Descrizione
POST	/generation/stream	Generazione con streaming SSE in tempo reale
POST	/generation/run	Generazione non-streaming (JSON)
API Pubbliche
#### Workspaces
Metodo	Path	Descrizione
GET	/api/workspaces	Lista workspaces dell'utente
POST	/api/workspaces	Crea workspace
GET	/api/workspaces/:workspaceId	Dettaglio workspace
PUT	/api/workspaces/:workspaceId	Aggiorna workspace
#### Artifacts
Metodo	Path	Descrizione
GET	/api/artifacts	Lista artefatti (filtrabile)
GET	/api/artifacts/:artifactId	Dettaglio artefatto
GET	/api/artifacts/:artifactId/download	Download artefatto (md/txt/docx)
#### Admin — Utenti, Modelli, API Services, Sessioni
Metodo	Path	Descrizione
CRUD	/admin/users + /:userId	Gestione utenti
CRUD	/api/admin/models + /:modelId	Catalogo modelli LLM
CRUD	/api/admin/api-services + /:serviceId + bindings	Gestione API servic
GET	/api/admin/sessions + /:sessionId + download	Vista admin sessioni