import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 4173,
    proxy: {
      '/api': 'http://127.0.0.1:5173',
      '/pet': 'http://127.0.0.1:5173',
      '/black': 'http://127.0.0.1:5173'
    }
  }
});
