import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: /api diteruskan ke backend lokal. Produksi: Nginx di container frontend melakukan hal yang sama.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8080', changeOrigin: false },
      '/uploads': { target: process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8080', changeOrigin: false },
    },
  },
});
