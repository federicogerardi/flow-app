---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/deployment
  - wiki/reverse-proxy
date_updated: 2026-08-02
source_count: 0
confidence: high
---

# Deployment Patterns — Phase 10 Findings

> Findings from Phase 10 (Deployment & CI/CD) implementation and subsequent reverse proxy attempts on Railway dev.

## Architectures Evaluated

### 1. Backend Public URL + Vite Build-Time `VITE_API_URL` ✅ (current)

```
Browser → <frontend-public-url>    (serve -s, static SPA)
Browser → <backend-public-url>     (Express API, CORS)
```

| Pro | Contro |
|-----|--------|
| Funziona, zero complessità reverse proxy | Backend esposto su URL pubblico |
| Deploy Railpack semplice | CORS necessario |
| `VITE_API_URL` inlineato nella build JS | URL hardcoded nella build |

**Setup**: Railpack builder, `VITE_API_URL=<backend-public-url>`, `CORS_ORIGIN=<frontend-public-url>`.

### 2. Internal DNS + nginx Reverse Proxy ❌ (10+ tentativi falliti)

```
Browser → <frontend-public-url>    (nginx)
           └─ /api/* → proxy_pass backend.railway.internal:3000
```

| Pro | Contro |
|-----|--------|
| Backend privato (solo rete Railway) | nginx config fragile |
| No CORS necessario | Template Docker nginx conflitta con `default.conf` base |
| URL relativi nel frontend | `listen ${PORT}` vs `listen 80` |

**Cause dei fallimenti**:

| # | Problema | Dettaglio |
|---|----------|-----------|
| 1 | `default.conf` base nginx sovrascrive il template | `rm -f /etc/nginx/conf.d/default.conf` necessario |
| 2 | `listen 80` invece di `listen ${PORT}` | Railway assegna porta dinamica, envsubst necessario |
| 3 | `backend.railway.internal` non risolvibile da resolver pubblici | `resolver 1.1.1.1` non funziona, serve proxy_pass diretto |
| 4 | Builder `RAILPACK` non switchato a `DOCKERFILE` | CLI `environment edit` ritorna "No changes to apply", solo MCP funziona |
| 5 | `npm prune --production` rimuove symlink workspace | `@flow-app/*` packages irrisolvibili a runtime |
| 6 | `serve -s` non fa reverse proxy | `/api/*` servito come `index.html` → JSON.parse fallisce |
| 7 | `vite preview` non adatto a produzione | Sostituito con `serve -s dist` |
| 8 | `tsx` necessario a runtime per ESM extensionless imports | `tsc` compila ma `.js` richiede estensioni esplicite in Node ESM |

### 3. Runtime Backend URL 🔵 (non implementato)

```
BACKEND_INTERNAL_URL = <service>.railway.internal:<port>
Frontend legge URL a RUNTIME (non Vite build time)
```

Pattern alternativo osservabile in altri progetti Railway: l'URL backend è una variabile d'ambiente letta a **runtime** (non `import.meta.env` di Vite), permettendo l'uso del DNS interno Railway. Per replicare questo pattern servirebbe:
- Refactor `AuthContext` e `ApiClient` per leggere l'URL backend da una variabile runtime (es. `window.__ENV__` o fetch da `/config.json`)
- Iniettare la variabile nel container a runtime (es. script entrypoint che scrive `config.js`)

### 4. Internal DNS + Caddy Reverse Proxy ❌

Provato ma fallito per problemi analoghi a nginx (config non applicata, builder rimasto RAILPACK).

## Lessons Learned

### Docker/Node in produzione

1. **`npm prune --production` rimuove i symlink dei workspace packages** — in un monorepo npm, i pacchetti `@flow-app/*` sono symlink in `node_modules/`. Il prune li elimina. Soluzione: non prunare, o ricrearli manualmente.

2. **Node ESM richiede estensioni `.js` esplicite** — TypeScript non le aggiunge. `tsx` gestisce questo in dev, ma in produzione con `node dist/server.js` fallisce. Soluzione: usare `npx tsx src/server.ts` (tsx in dependencies, non devDependencies).

3. **Railpack non passa automaticamente le variabili di servizio al build** — con `ARG VITE_API_URL` nel Dockerfile funziona, ma con Railpack le variabili non sono disponibili durante `npm run build`. Verificare se il `VITE_API_URL` è effettivamente inlineato nel JS.

### Railway-specific

4. **`railway environment edit --service-config` non applica modifiche** — il CLI risponde "No changes to apply" per campi `build.builder`, `build.dockerfilePath`, etc. Solo il MCP (`railway_update_service`) o la variabile `RAILWAY_DOCKERFILE_PATH` forzano il cambio builder.

5. **Il builder di default per servizi esistenti è `RAILPACK`** — anche con `Dockerfile.frontend` presente, Railway ignora il Dockerfile se il builder non è esplicitamente `DOCKERFILE`.

6. **`backend.railway.internal` risolve solo DENTRO la rete Railway** — usabile solo da reverse proxy (nginx/Caddy) o da codice runtime nel container, mai dal browser dell'utente.

### Frontend/SPA

7. **`serve -s` serve TUTTE le route come `index.html`** — non fa reverse proxy. `/api/*` → `index.html` → JSON.parse fallisce. Serve un reverse proxy dedicato (nginx/Caddy/Node) per il routing API.

8. **`vite preview` è un dev server, non production** — Railway raccomanda `serve -s dist` per SPA statiche.

## Raccomandazioni

| Scenario | Approccio |
|----------|-----------|
| Dev veloce, backend pubblico ok | ✅ Pattern 1 (URL pubblico + CORS) |
| Produzione, backend privato | Pattern 2 (nginx) con le fix documentate sopra |
| Multi-env con URL dinamici | Pattern 3 (runtime URL) |
| Produzione, backend privato, stack Node | Pattern 5 (Node.js thin proxy) |

## Pattern 5 — Node.js Thin Reverse Proxy ✅ (deployed 2026-08-03)

```
Browser → frontend (Node.js express on :3000)
           ├─ GET /*        → express.static(dist/) + SPA fallback
           ├─ GET /api/*    → http-proxy → http://backend.railway.internal:3000
           └─ GET /health   → http-proxy → http://backend.railway.internal:3000/health
```

Attempted on Railway dev with 6 deploys as of 2026-08-03. Key learnings:

| # | Problem | Root cause |
|---|---------|------------|
| 1 | `npm install --omit=dev` fails | Package.json refs `@flow-app/*` workspace packages — not resolvable from npm registry |
| 2 | `express` not found at runtime | npm hoisting doesn't put workspace deps in root `node_modules` |
| 3 | Railway skips deploy on same SHA | Commit code change (any file) for new SHA |
| 4 | BuildKit `import.meta.env` TS errors | Intermittent — fresh cache works, likely layer staleness |

**Fix**: `npm install express http-proxy-middleware` directly (not via `package.json`).

## Related

- [[Environment Configuration]]
- [[LLM Gateway - OpenRouter]]
- [[Environment Configuration]]
