import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 3000;

const app = express();

const apiProxy = createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathFilter: '/api',
  on: {
    error: (err, _req, res) => {
      console.error(`Proxy error (${BACKEND_URL}):`, err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Backend unreachable', status: 502 }));
      }
    },
  },
});

// Use pathFilter (not app.use('/api', ...)) so Express doesn't strip the prefix.
// With app.use('/api', proxy), Express sets req.url to /sessions instead of
// /api/sessions, and the backend returns 404.
app.use(apiProxy);
// Direct health endpoint — returns 200 even if backend is unreachable.
// Docker HEALTHCHECK must be independent of backend DNS resolution
// which can take several seconds on Railway's private network.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', proxy: BACKEND_URL });
});
app.use(express.static(resolve(__dirname, 'dist')));
// Express 5 uses path-to-regexp v8 — bare '*' is not valid. Use named wildcard /*splat
app.get('/{*splat}', (_, res) => res.sendFile(resolve(__dirname, 'dist', 'index.html')));

app.listen(PORT, () => {
  console.log(`Frontend proxy listening on :${PORT}, backend → ${BACKEND_URL}`);
});
