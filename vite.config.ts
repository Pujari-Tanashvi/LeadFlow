import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// The frontend talks to the LeadFlow API on the same origin. In development
// Vite proxies `/api` and the Socket.IO upgrade to the Express server, which
// keeps the JWT, CORS and the live channel identical in dev and production.
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:4000';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: false,
        },
        '/socket.io': {
          target: apiTarget,
          changeOrigin: false,
          ws: true,
        },
      },
    },
  };
});
