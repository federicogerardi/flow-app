# Flow App — User Stories

> Versione: 1.0 — Stato: **Draft** — Ultimo aggiornamento: 2026-07-30

---

## Convenzioni

- **Formato**: "Come `<persona>`, voglio `<azione>` per `<beneficio>`"
- **Priorità**: P0 (must-have), P1 (should-have), P2 (could-have)
- **Stato**: ✅ Done / 🔄 In Progress / 📝 Planned / 💡 Idea
- **Personas**: CM (Content Marketer), SA (SEO Analyst), AD (Admin)

---

## Epic 1 — Onboarding & Autenticazione

| ID | Story | Persona | Pri | Stato |
|----|-------|---------|-----|-------|
| **US-A01** | Come nuovo utente, voglio registrarmi con Google per accedere subito senza ricordare una nuova password | CM | P0 | ✅ |
| **US-A02** | Come utente, voglio fare login con email/password come alternativa al social login | CM | P0 | ✅ |
| **US-A03** | Come utente, voglio rimanere autenticato tra le sessioni per non dover rifare login ogni volta | CM | P0 | ✅ |
| **US-A04** | Come utente, voglio vedere e revocare le mie sessioni attive per controllare gli accessi al mio account | CM | P1 | ✅ |
| **US-A05** | Come admin, voglio vedere la lista utenti registrati e il loro ruolo per gestire l'accesso alla piattaforma | AD | P0 | ✅ |
| **US-A06** | Come admin, voglio cambiare il ruolo di un utente (admin ↔ member) per delegare o revocare privilegi | AD | P0 | ✅ |
| **US-A07** | Come admin, voglio disabilitare un utente per bloccare l'accesso senza cancellare i suoi dati | AD | P1 | ✅ |

---

## Epic 2 — Workspace

| ID         | Story                                                                                                                                                | Persona | Pri | Stato |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --- | ----- |
| **US-W01** | Come content marketer, voglio creare un workspace per organizzare i contenuti di una specifica campagna                                              | CM      | P0  | ✅     |
| **US-W02** | Come content marketer, voglio vedere tutti i miei workspaces in una dashboard centrale per navigare rapidamente tra le campagne                      | CM      | P0  | ✅     |
| **US-W03** | Come content marketer, voglio accedere alla cronologia delle generazioni di un workspace per recuperare contenuti passati                            | CM      | P0  | ✅     |
| **US-W04** | Come content marketer, voglio selezionare un workspace attivo prima di usare un tool per associare gli output al workspace corretto                  | CM      | P0  | ✅     |
| **US-W05** | Come content marketer, voglio vedere lo stato di readiness del tool in base al workspace e ai file caricati, per capire cosa manca prima di iniziare | CM      | P0  | ✅     |
| **US-W06** | Come content marketer, voglio vedere i crediti rimanenti del mese nel workspace per sapere quante generazioni posso ancora fare                      | CM      | P0  | ✅     |

---

## Epic 3 — Asset Management (Brief, Brand Voice, Personas, Angles)

| ID | Story | Persona | Pri | Stato |
|----|-------|---------|-----|-------|
| **US-AS01** | Come content marketer, voglio generare un Brief da un documento caricato per standardizzare il contesto di partenza delle campagne | CM | P0 | ✅ |
| **US-AS02** | Come content marketer, voglio generare un Tone of Voice da materiale aziendale per mantenere coerenza di stile in tutti i contenuti | CM | P0 | ✅ |
| **US-AS03** | Come content marketer, voglio generare Personas dal mio materiale di marketing per targettizzare meglio i contenuti | CM | P0 | ✅ |
| **US-AS04** | Come content marketer, voglio visualizzare e selezionare gli Asset disponibili nel Knowledge Panel durante la configurazione di un tool | CM | P0 | ✅ |
| **US-AS05** | Come content marketer, voglio che i miei Asset vengano automaticamente iniettati nei prompt di generazione senza doverli ricopiare ogni volta | CM | P0 | ✅ |
| **US-AS06** | Come content marketer, voglio essere bloccato dall'avviare una generazione se manca un Asset obbligatorio, con un messaggio chiaro su cosa caricare | CM | P0 | ✅ |
| **US-AS07** | Come content marketer, voglio promuovere un output di generazione ad Asset riutilizzabile con un click, senza dover ricaricare file | CM | P1 | ✅ |
| **US-AS08** | Come admin, voglio gestire la mappatura `toolKey → assetType` per controllare quali Asset ogni tool può consumare | AD | P1 | ✅ |

---

## Epic 4 — Tool: Generazione Contenuti (Funnel, Nextland, YouTube)

| ID | Story | Persona | Pri | Stato |
|----|-------|---------|-----|-------|
| **US-T01** | Come content marketer, voglio caricare un briefing e ottenere una sequenza completa di landing page funnel (optin → quiz → VSL) | CM | P0 | ✅ |
| **US-T02** | Come content marketer, voglio generare landing page Nextland con pagina di ringraziamento in un unico flusso | CM | P0 | ✅ |
| **US-T03** | Come content marketer, voglio ottenere uno script YouTube long-form completo in 6 passaggi strutturati (analisi → packaging → intro → body → CTA → outro) | CM | P0 | ✅ |
| **US-T04** | Come content marketer, voglio visualizzare il progresso step-by-step della generazione con una barra di avanzamento animata | CM | P0 | ✅ |
| **US-T05** | Come content marketer, voglio poter interrompere una generazione in corso senza perdere gli step già completati | CM | P0 | ✅ |
| **US-T06** | Come content marketer, voglio riprendere un workflow interrotto dall'ultimo checkpoint senza rifare gli step già completati | CM | P0 | ✅ |
| **US-T07** | Come content marketer, voglio rigenerare uno step specifico mantenendo il contesto degli step precedenti, per correggere solo la parte che non mi soddisfa | CM | P0 | ✅ |
| **US-T08** | Come content marketer, voglio scaricare l'output finale in formato `.docx` o `.pdf` per condividerlo con il team | CM | P0 | ✅ |
| **US-T09** | Come content marketer, voglio vedere la history delle mie sessioni di generazione per un tool, con anteprima dei risultati per step | CM | P1 | ✅ |
| **US-T10** | Come content marketer, voglio chiudere il browser durante una generazione lunga e ritrovare i risultati completati al mio ritorno | CM | P0 | ✅ |

---

## Epic 5 — Tool: Angle Generator

| ID | Story | Persona | Pri | Stato |
|----|-------|---------|-----|-------|
| **US-AG01** | Come content marketer, voglio caricare un briefing + un file Angle Detector per estrarre angoli marketing differenziati | CM | P0 | ✅ |
| **US-AG02** | Come content marketer, voglio ottenere una matrice di angoli prioritizzati con attivazioni creative per ogni angolo | CM | P0 | ✅ |
| **US-AG03** | Come content marketer, voglio che l'Angle Detector sia opzionale ma raccomandato, con un messaggio che spiega perché migliora i risultati | CM | P1 | ✅ |
| **US-AG04** | Come content marketer, voglio promuovere un angolo generato ad Asset `angle` per usarlo in altri tool (es. Meta Ads) | CM | P1 | ✅ |

---

## Epic 6 — Tool: YouTube Description

| ID | Story | Persona | Pri | Stato |
|----|-------|---------|-----|-------|
| **US-YD01** | Come content marketer, voglio generare una descrizione YouTube ottimizzata compilando solo form fields (titolo, topic, social link, hashtag) senza dover caricare file | CM | P0 | ✅ |
| **US-YD02** | Come content marketer, voglio che i campi social link e hashtag siano opzionali e non blocchino la generazione se vuoti | CM | P0 | ✅ |
| **US-YD03** | Come content marketer, voglio che la descrizione generata sia in formato Markdown pronto per essere incollato su YouTube | CM | P0 | ✅ |
| **US-YD04** | Come content marketer, voglio che il Tone of Voice aziendale (se disponibile) venga applicato automaticamente alla descrizione | CM | P1 | ✅ |

---

## Epic 7 — Tool: Blog Article Generator

| ID | Story | Persona | Pri | Stato |
|----|-------|---------|-----|-------|
| **US-BL01** | Come content marketer, voglio inserire un titolo e ottenere un articolo blog completo in 3 passaggi (struttura SEO → outline → articolo) | CM | P0 | ✅ |
| **US-BL02** | Come content marketer, voglio che la struttura SEO e la ricerca usino modelli con web search per dati aggiornati | CM | P1 | ✅ |
| **US-BL03** | Come content marketer, voglio che ogni step sia rieseguibile indipendentemente per affinare sezioni specifiche | CM | P1 | ✅ |
| **US-BL04** | Come content marketer, voglio vedere l'anteprima del session summary con tutti e 3 gli step prima di scaricare | CM | P1 | ✅ |

---

## Epic 8 — Tool: Geometric (Analisi SERP Competitiva)

| ID | Story | Persona | Pri | Stato |
|----|-------|---------|-----|-------|
| **US-GE01** | Come SEO analyst, voglio inserire una keyword, lingua e paese per avviare un'analisi competitiva SERP | SA | P0 | ✅ |
| **US-GE02** | Come SEO analyst, voglio che il sistema faccia crawling dei risultati Google via SerpAPI, estraendo AI Overview, snippet e People Also Ask | SA | P0 | ✅ |
| **US-GE03** | Come SEO analyst, voglio che i competitor vengano automaticamente raggruppati, classificati per tipo fonte e ordinati per rilevanza (scoring deterministico) | SA | P0 | ✅ |
| **US-GE04** | Come SEO analyst, voglio un report strategico qualitativo che interpreti i pattern competitivi e suggerisca azioni | SA | P0 | ✅ |
| **US-GE05** | Come SEO analyst, voglio un report unificato finale che combini analisi qualitativa e ranking quantitativo in un unico documento | SA | P0 | ✅ |
| **US-GE06** | Come SEO analyst, voglio scaricare il report unificato come file per condividerlo con stakeholder | SA | P1 | ✅ |
| **US-GE07** | Come SEO analyst, voglio che l'analisi usi fino a 4 query "People Also Ask" oltre alla mia keyword per una copertura più ampia | SA | P1 | ✅ |
| **US-GE08** | Come admin, voglio poter verificare la qualità del crawling (sorgenti, AI Overview confidence, errori) per diagnosticare problemi | AD | P2 | 📝 |
| **US-GE09** | Come SEO analyst, voglio che i costi SerpAPI siano ottimizzati — il crawling non deve essere rieseguito per ogni step di generazione | SA | P1 | 📝 (Fase 3) |
| **US-GE10** | Come SEO analyst, voglio confrontare due analisi della stessa keyword in momenti diversi per tracciare cambiamenti nel panorama competitivo | SA | P2 | 💡 |

---

## Epic 9 — Tool: Meta Ads

| ID | Story | Persona | Pri | Stato |
|----|-------|---------|-----|-------|
| **US-MA01** | Come content marketer, voglio caricare un briefing e selezionare un obiettivo campagna per generare copy per Meta Ads | CM | P1 | ✅ |
| **US-MA02** | Come content marketer, voglio che gli angoli marketing e il brand voice vengano automaticamente integrati nella copy degli ads | CM | P1 | ✅ |
| **US-MA03** | Come content marketer, voglio promuovere la copy ads generata ad Asset `ad-copy` per il riutilizzo | CM | P1 | ✅ |

---

## Epic 10 — Flusso di Generazione & Performance

| ID | Story | Persona | Pri | Stato |
|----|-------|---------|-----|-------|
| **US-GF01** | Come content marketer, voglio inviare una richiesta di generazione e ricevere subito una conferma, senza dover aspettare il completamento | CM | P0 | ✅ |
| **US-GF02** | Come content marketer, voglio vedere il progresso in tempo reale di ogni step via SSE, con nome step, stato e percentuale | CM | P0 | ✅ |
| **US-GF03** | Come content marketer, voglio essere avvisato se la connessione SSE si interrompe, con un pulsante per riconnettermi | CM | P0 | ✅ |
| **US-GF04** | Come content marketer, voglio che due richieste identiche non producano contenuti duplicati né consumino crediti doppi | CM | P0 | ✅ |
| **US-GF05** | Come content marketer, voglio che il sistema usi il miglior modello LLM per ogni step senza che io debba configurarlo manualmente | CM | P1 | 📝 |
| **US-GF06** | Come content marketer, voglio generare più varianti di output con un solo submit per confrontare approcci diversi | CM | P2 | 📝 |
| **US-GF07** | Come content marketer, voglio poter mettere in pausa un workflow, rivedere un output intermedio, approvarlo e far ripartire lo step successivo | CM | P2 | 📝 |
| **US-GF08** | Come content marketer, voglio che il sistema impari dalle mie preferenze (mi piace/non mi piace) per migliorare gli output futuri | CM | P2 | 📝 |
| **US-GF09** | Come content marketer, voglio confrontare due varianti di output side-by-side per decidere quale funziona meglio | CM | P2 | 📝 |

---

## Epic 11 — Amministrazione Piattaforma

| ID | Story | Persona | Pri | Stato |
|----|-------|---------|-----|-------|
| **US-AD01** | Come admin, voglio vedere la lista dei modelli LLM disponibili e il loro stato (attivo/disattivo) | AD | P0 | ✅ |
| **US-AD02** | Come admin, voglio attivare o disattivare un modello LLM per controllare quali modelli gli utenti possono selezionare | AD | P0 | ✅ |
| **US-AD03** | Come admin, voglio configurare API service esterne (endpoint, autenticazione, header) per abilitare l'acquisizione dati nei tool | AD | P0 | ✅ |
| **US-AD04** | Come admin, voglio associare un API service a specifici step di specifici tool per controllare dove viene usato | AD | P0 | ✅ |
| **US-AD05** | Come admin, voglio pubblicare note di changelog visibili agli utenti per comunicare nuove feature e fix | AD | P1 | ✅ |
| **US-AD06** | Come admin, voglio ricevere e categorizzare i report degli utenti (bug, feature request, feedback) con link a issue GitHub | AD | P1 | ✅ |
| **US-AD07** | Come admin, voglio un pannello di monitoring per i job ToolWorkflowJob attivi, completati e falliti | AD | P1 | ✅ |
| **US-AD08** | Come admin, voglio vedere i costi in token e USD aggregati per job e per utente per monitorare la spesa LLM | AD | P1 | ✅ |
| **US-AD09** | Come admin, voglio filtrare i job per tool, stato e utente per diagnosticare problemi specifici | AD | P1 | ✅ |

---

## Epic 12 — Qualità & Feedback

| ID          | Story                                                                                                                                                   | Persona | Pri | Stato                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --- | ------------------------ |
| **US-QF01** | Come content marketer, voglio vedere un feedback panel unificato nella colonna destra che cambia in base allo stato della generazione                   | CM      | P0  | ✅                        |
| **US-QF02** | Come content marketer, voglio vedere lo stato di readiness pre-flight (workspace selezionato? file caricato? asset disponibili?) prima di poter avviare | CM      | P0  | ✅                        |
| **US-QF03** | Come content marketer, voglio ricevere messaggi di errore chiari e azionabili se qualcosa va storto durante la generazione                              | CM      | P0  | ✅                        |
| **US-QF04** | Come content marketer, voglio poter ritentare una generazione fallita con un click, senza dover ricaricare tutto                                        | CM      | P0  | ✅                        |
| **US-QF05** | Come content marketer, voglio che l'interfaccia sia accessibile da tastiera e screen reader per poter lavorare senza mouse                              | CM      | P0  | ✅                        |
| **US-QF06** | Come content marketer, voglio che il tema (chiaro/scuro) segua le mie preferenze di sistema                                                             | CM      | P1  | ✅                        |
| **US-QF07** | Come content marketer, voglio lasciare un feedback (👍/👎) su un output generato per aiutare a migliorare la qualità                                    | CM      | P2  | 🔄 (solo UI, no backend) |
| **US-QF08** | Come content marketer, voglio taggare un output come "funziona" / "non funziona" / "da testare" per tracciare l'efficacia dei contenuti                 | CM      | P2  | 💡                       |

---

## Epic 13 — Sicurezza & Conformità

| ID | Story | Persona | Pri | Stato |
|----|-------|---------|-----|-------|
| **US-SC01** | Come utente, voglio che i miei dati siano protetti da CSRF per evitare attacchi cross-site | CM | P0 | ✅ |
| **US-SC02** | Come utente, voglio che le mie richieste siano rate-limited per evitare abusi del mio account | CM | P0 | ✅ |
| **US-SC03** | Come admin, voglio che le API key e i token dei servizi esterni non appaiano mai nei log o nelle risposte pubbliche | AD | P0 | ✅ |
| **US-SC04** | Come admin, voglio che il sistema si rifiuti di avviare se la configurazione di sicurezza CSRF è assente (fail-closed) | AD | P0 | ✅ |
| **US-SC05** | Come admin, voglio un audit trail di tutti i consumi crediti per riconciliare la fatturazione | AD | P1 | ✅ |
| **US-SC06** | Come content marketer, voglio sapere esattamente quanti crediti consumerà una generazione prima di avviarla | CM | P1 | ✅ |

---

## Epic 14 — Osservabilità & Monitoring

| ID | Story | Persona | Pri | Stato |
|----|-------|---------|-----|-------|
| **US-OB01** | Come admin, voglio log strutturati con correlation ID per tracciare una richiesta attraverso tutti i servizi | AD | P0 | ✅ |
| **US-OB02** | Come admin, voglio monitorare CPU, memoria, error rate e response time della piattaforma | AD | P0 | ✅ |
| **US-OB03** | Come admin, voglio essere avvisato se l'error rate supera il 5% o il response time P95 supera i 5 secondi | AD | P1 | 🔄 |
| **US-OB04** | Come admin, voglio una dashboard con il numero di job attivi, in coda, completati e falliti in tempo reale | AD | P1 | ✅ |

---

## Riepilogo per Stato

| Stato | Count |
|-------|-------|
| ✅ Done | 61 |
| 🔄 In Progress | 2 |
| 📝 Planned | 8 |
| 💡 Idea | 3 |
| **Totale** | **74** |

## Riepilogo per Priorità

| Priorità | Count |
|----------|-------|
| P0 (must-have) | 47 |
| P1 (should-have) | 19 |
| P2 (could-have) | 8 |

---

> ⚑ **DDD Reference**: [Glossary](docs/01-requirements/domain-ubiquitous-language-glossary.md) · [BCM](docs/02-design/domain-bounded-context-map.md) · [Decision Log](docs/07-governance/domain-naming-decision-log.md) · [App Concept](APP-CONCEPT.md) · [PRD](PRD.md)
