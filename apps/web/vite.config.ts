import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API_TARGET = process.env.VITE_API_TARGET ?? 'http://127.0.0.1:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Same-origin in the browser, so the session cookie needs no CORS dance
      // and SSE streams are not buffered by a cross-origin hop.
      '/api': {
        target: API_TARGET,
        changeOrigin: false,
      },
    },
  },
});
