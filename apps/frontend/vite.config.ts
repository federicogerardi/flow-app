import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-mui': ['@mui/material', '@mui/icons-material'],
            'vendor-xstate': ['xstate', '@xstate/react'],
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_URL ?? 'http://localhost:3000',
          changeOrigin: true,
        },
        '/health': {
          target: env.VITE_API_URL ?? 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
