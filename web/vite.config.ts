import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const SERVER = process.env.VITE_SERVER_URL ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // hls.js is large; a separate chunk keeps the app code small and cacheable.
      output: { manualChunks: { hls: ['hls.js'] } },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/media': SERVER,
      '/api': SERVER,
    },
  },
});
