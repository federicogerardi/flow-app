import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 3000;

const app = express();

app.use('/api', createProxyMiddleware({ target: BACKEND_URL, changeOrigin: true }));
app.use('/health', createProxyMiddleware({ target: BACKEND_URL, changeOrigin: true }));
app.use(express.static(resolve(__dirname, 'dist')));
app.get('*', (_, res) => res.sendFile(resolve(__dirname, 'dist', 'index.html')));

app.listen(PORT, () => console.log(`Frontend proxy listening on :${PORT}`));
